// src/debts/services/debtPaymentPlanProcessor.service.ts
// Phase 10 debt payment-plan processor.
// It previews or generates due debt payments from debts with payment plans.
// When writing, it creates:
// - Transaction type debt_payment.
// - Payment linked to that transaction.
// - Updates plan counters and nextDueDate.
// Duplicate protection uses reference: debt-plan:<debtId>:<yyyy-mm-dd>.

import { Types } from "mongoose";

import { createPaymentService } from "@/src/payments/services/payments.service";
import { PaymentModel } from "@/src/payments/models/Payment.model";
import { TransactionModel } from "@/src/transactions/models/Transaction.model";
import { createTransactionService } from "@/src/transactions/services/transactions.service";
import type { CashflowDirection } from "@/src/shared/types/common";
import { DebtModel } from "../models/Debt.model";
import type {
    DebtDocument,
    DebtGeneratedPaymentResult,
    DebtInstallmentFrequency,
    ProcessDueDebtPaymentItem,
    ProcessDueDebtPaymentsResult,
    ProcessDueDebtPaymentsServiceInput,
} from "../types/debts.types";

export class DebtPaymentPlanProcessorError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.name = "DebtPaymentPlanProcessorError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

export function isDebtPaymentPlanProcessorError(
    error: Error
): error is DebtPaymentPlanProcessorError {
    return error instanceof DebtPaymentPlanProcessorError;
}

function parseProcessDate(value: string | undefined): Date {
    if (!value) {
        return new Date();
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        throw new DebtPaymentPlanProcessorError(
            "La fecha de corte no es válida.",
            400,
            "INVALID_PROCESS_DATE"
        );
    }

    return parsedDate;
}

function roundMoney(value: number): number {
    return Number(value.toFixed(2));
}

function toDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
}

function buildDebtPlanReference(debtId: Types.ObjectId, paymentDate: Date): string {
    return `debt-plan:${debtId.toString()}:${toDateOnly(paymentDate)}`;
}

function getDebtCashflowDirection(debt: DebtDocument): CashflowDirection {
    return debt.type === "owed_by_me" ? "out" : "in";
}

function clampDay(year: number, monthIndex: number, day: number): number {
    return Math.min(day, new Date(year, monthIndex + 1, 0).getDate());
}

function getEndOfMonthDate(base: Date): Date {
    return new Date(
        base.getFullYear(),
        base.getMonth() + 1,
        0,
        base.getHours(),
        base.getMinutes(),
        base.getSeconds(),
        base.getMilliseconds()
    );
}

function addInstallmentFrequency(
    date: Date,
    frequency: DebtInstallmentFrequency,
    paymentDay: number | null
): Date {
    const base = new Date(date);
    const year = base.getFullYear();
    const monthIndex = base.getMonth();
    const day = paymentDay ?? base.getDate();

    if (frequency === "weekly") {
        base.setDate(base.getDate() + 7);
        return base;
    }

    if (frequency === "biweekly") {
        base.setDate(base.getDate() + 14);
        return base;
    }

    if (frequency === "semimonthly") {
        const currentDay = base.getDate();

        if (currentDay < 15) {
            return new Date(
                year,
                monthIndex,
                15,
                base.getHours(),
                base.getMinutes(),
                base.getSeconds(),
                base.getMilliseconds()
            );
        }

        if (currentDay < getEndOfMonthDate(base).getDate()) {
            return getEndOfMonthDate(base);
        }

        return new Date(
            year,
            monthIndex + 1,
            15,
            base.getHours(),
            base.getMinutes(),
            base.getSeconds(),
            base.getMilliseconds()
        );
    }

    if (frequency === "yearly") {
        const nextYear = year + 1;
        const nextDay = clampDay(nextYear, monthIndex, day);

        return new Date(
            nextYear,
            monthIndex,
            nextDay,
            base.getHours(),
            base.getMinutes(),
            base.getSeconds(),
            base.getMilliseconds()
        );
    }

    const nextMonth = monthIndex + 1;
    const nextYear = year + Math.floor(nextMonth / 12);
    const normalizedNextMonth = nextMonth % 12;
    const nextDay = clampDay(nextYear, normalizedNextMonth, day);

    return new Date(
        nextYear,
        normalizedNextMonth,
        nextDay,
        base.getHours(),
        base.getMinutes(),
        base.getSeconds(),
        base.getMilliseconds()
    );
}

function getPaymentBreakdown(debt: DebtDocument): {
    amount: number;
    principalAmount: number;
    feeAmount: number;
} {
    const configuredAmount = debt.installmentAmount ?? 0;
    const configuredFeeAmount = debt.expectedFeeAmount ?? 0;
    const configuredPrincipalAmount =
        debt.expectedPrincipalAmount ?? roundMoney(configuredAmount - configuredFeeAmount);
    const principalAmount = roundMoney(
        Math.min(debt.remainingAmount, configuredPrincipalAmount)
    );
    const feeAmount = roundMoney(configuredFeeAmount);
    const amount = roundMoney(principalAmount + feeAmount);

    return {
        amount,
        principalAmount,
        feeAmount,
    };
}

function getNextPlanCounters(debt: DebtDocument): {
    paidInstallments: number | null;
    remainingInstallments: number | null;
} {
    const currentPaidInstallments = debt.paidInstallments ?? 0;
    const totalInstallments = debt.totalInstallments ?? null;
    const paidInstallments =
        totalInstallments === null
            ? currentPaidInstallments + 1
            : Math.min(totalInstallments, currentPaidInstallments + 1);
    const remainingInstallments =
        totalInstallments === null
            ? null
            : Math.max(0, totalInstallments - paidInstallments);

    return {
        paidInstallments,
        remainingInstallments,
    };
}

function getNextDueDateAfterPayment(
    debt: DebtDocument,
    scheduledPaymentDate: Date,
    remainingInstallments: number | null
): Date | null {
    if (remainingInstallments !== null && remainingInstallments <= 0) {
        return null;
    }

    if (!debt.installmentFrequency) {
        return null;
    }

    return addInstallmentFrequency(
        scheduledPaymentDate,
        debt.installmentFrequency,
        debt.paymentDay ?? null
    );
}

async function findExistingGeneratedTransaction(args: {
    workspaceId: Types.ObjectId;
    debtId: Types.ObjectId;
    scheduledPaymentDate: Date;
}): Promise<Types.ObjectId | null> {
    const reference = buildDebtPlanReference(args.debtId, args.scheduledPaymentDate);

    const transaction = await TransactionModel.findOne({
        workspaceId: args.workspaceId,
        reference,
        isArchived: { $ne: true },
    })
        .select({ _id: 1 })
        .lean<{ _id: Types.ObjectId } | null>();

    return transaction?._id ?? null;
}

async function findPaymentByTransactionId(args: {
    workspaceId: Types.ObjectId;
    transactionId: Types.ObjectId;
}): Promise<Types.ObjectId | null> {
    const payment = await PaymentModel.findOne({
        workspaceId: args.workspaceId,
        transactionId: args.transactionId,
    })
        .select({ _id: 1 })
        .lean<{ _id: Types.ObjectId } | null>();

    return payment?._id ?? null;
}

function buildSkippedItem(args: {
    debt: DebtDocument;
    scheduledPaymentDate: Date;
    action: ProcessDueDebtPaymentItem["action"];
    reason: string;
}): ProcessDueDebtPaymentItem {
    return {
        debtId: args.debt._id,
        debtName: args.debt.description,
        scheduledPaymentDate: args.scheduledPaymentDate,
        nextDueDate: args.debt.nextDueDate ?? null,
        action: args.action,
        reason: args.reason,
        transactionId: null,
        paymentId: null,
        amount: 0,
        principalAmount: 0,
        feeAmount: 0,
    };
}

function validateDebtForProcessing(
    debt: DebtDocument,
    scheduledPaymentDate: Date
): ProcessDueDebtPaymentItem | null {
    if (debt.status !== "active" && debt.status !== "overdue") {
        return buildSkippedItem({
            debt,
            scheduledPaymentDate,
            action: debt.status === "paid" ? "skipped_paid" : "skipped_inactive",
            reason: "La deuda no está activa para generar pagos.",
        });
    }

    if (!debt.paymentPlanEnabled || !debt.autoGeneratePayments) {
        return buildSkippedItem({
            debt,
            scheduledPaymentDate,
            action: "skipped_invalid_plan",
            reason: "La deuda no tiene plan activo con motor habilitado.",
        });
    }

    if (!debt.relatedAccountId) {
        return buildSkippedItem({
            debt,
            scheduledPaymentDate,
            action: "skipped_missing_account",
            reason: "La deuda necesita una cuenta relacionada para generar el pago.",
        });
    }

    if (!debt.memberId) {
        return buildSkippedItem({
            debt,
            scheduledPaymentDate,
            action: "skipped_missing_member",
            reason: "La deuda necesita un miembro relacionado para generar el pago.",
        });
    }

    if (!debt.installmentAmount || debt.installmentAmount <= 0) {
        return buildSkippedItem({
            debt,
            scheduledPaymentDate,
            action: "skipped_invalid_plan",
            reason: "La deuda no tiene monto por pago válido.",
        });
    }

    if (!debt.installmentFrequency) {
        return buildSkippedItem({
            debt,
            scheduledPaymentDate,
            action: "skipped_invalid_plan",
            reason: "La deuda no tiene frecuencia válida.",
        });
    }

    if (debt.remainingAmount <= 0) {
        return buildSkippedItem({
            debt,
            scheduledPaymentDate,
            action: "skipped_paid",
            reason: "La deuda ya no tiene saldo pendiente.",
        });
    }

    return null;
}

async function createDebtPlanPayment(args: {
    workspaceId: Types.ObjectId;
    workspace: ProcessDueDebtPaymentsServiceInput["workspace"];
    debt: DebtDocument;
    scheduledPaymentDate: Date;
    createdByUserId: Types.ObjectId;
}): Promise<DebtGeneratedPaymentResult> {
    const { workspaceId, workspace, debt, scheduledPaymentDate, createdByUserId } = args;
    const reference = buildDebtPlanReference(debt._id, scheduledPaymentDate);
    const cashflowDirection = getDebtCashflowDirection(debt);
    const { amount, principalAmount, feeAmount } = getPaymentBreakdown(debt);

    const transaction = await createTransactionService({
        workspaceId,
        workspace,
        body: {
            accountId: debt.relatedAccountId?.toString() ?? null,
            destinationAccountId: null,
            cardId: null,
            debtId: debt._id.toString(),
            memberId: debt.memberId?.toString() ?? createdByUserId.toString(),
            categoryId: null,
            type: "debt_payment",
            cashflowDirection,
            amount,
            currency: debt.currency,
            description: `Pago programado: ${debt.description}`,
            merchant: debt.personName,
            transactionDate: scheduledPaymentDate.toISOString(),
            status: "posted",
            reference,
            notes: `Generado desde plan de pagos de deuda: ${debt.description}`,
            isRecurring: false,
            recurrenceRule: null,
            isVisible: true,
            createdByUserId: createdByUserId.toString(),
        },
    });

    const payment = await createPaymentService({
        workspaceId,
        workspace,
        body: {
            debtId: debt._id.toString(),
            accountId: debt.relatedAccountId?.toString() ?? null,
            cardId: null,
            memberId: debt.memberId?.toString() ?? null,
            transactionId: transaction._id.toString(),
            amount,
            principalAmount,
            feeAmount,
            cashflowDirection,
            currency: debt.currency,
            paymentDate: scheduledPaymentDate.toISOString(),
            method: "bank_transfer",
            reference,
            notes: `Generado desde plan de pagos de deuda: ${debt.description}`,
            status: "completed",
            isVisible: true,
        },
    });

    const freshDebt = await DebtModel.findOne({
        _id: debt._id,
        workspaceId,
    }).lean<DebtDocument | null>();

    if (!freshDebt) {
        throw new DebtPaymentPlanProcessorError(
            "No fue posible leer la deuda después de generar el pago.",
            500,
            "DEBT_NOT_FOUND_AFTER_PAYMENT"
        );
    }

    const counters = getNextPlanCounters(freshDebt);
    const nextDueDate = getNextDueDateAfterPayment(
        freshDebt,
        scheduledPaymentDate,
        counters.remainingInstallments
    );

    const updatedDebt = await DebtModel.findOneAndUpdate(
        {
            _id: debt._id,
            workspaceId,
        },
        {
            $set: {
                paidInstallments: counters.paidInstallments,
                remainingInstallments: counters.remainingInstallments,
                nextDueDate,
                lastGeneratedPaymentId: payment._id,
                lastGeneratedTransactionId: transaction._id,
            },
        },
        {
            new: true,
        }
    ).lean<DebtDocument | null>();

    if (!updatedDebt) {
        throw new DebtPaymentPlanProcessorError(
            "No fue posible actualizar el plan de pagos de la deuda.",
            500,
            "DEBT_PLAN_UPDATE_FAILED"
        );
    }

    return {
        debt: updatedDebt,
        transaction,
        payment,
    };
}

export async function processDueDebtPaymentsService(
    input: ProcessDueDebtPaymentsServiceInput
): Promise<ProcessDueDebtPaymentsResult> {
    const { workspaceId, body, workspace } = input;
    const dryRun = body.dryRun ?? true;
    const asOfDate = parseProcessDate(body.asOfDate);
    const limit = body.limit ?? 50;

    const dueDebts = await DebtModel.find({
        workspaceId,
        paymentPlanEnabled: true,
        autoGeneratePayments: true,
        isVisible: true,
        status: { $in: ["active", "overdue"] },
        remainingAmount: { $gt: 0 },
        nextDueDate: { $lte: asOfDate },
    })
        .sort({
            nextDueDate: 1,
            createdAt: 1,
        })
        .limit(limit)
        .lean<DebtDocument[]>();

    const items: ProcessDueDebtPaymentItem[] = [];
    let generatedCount = 0;
    let skippedCount = 0;

    for (const debt of dueDebts) {
        const scheduledPaymentDate = debt.nextDueDate ?? asOfDate;
        const invalidItem = validateDebtForProcessing(debt, scheduledPaymentDate);

        if (invalidItem) {
            items.push(invalidItem);
            skippedCount += 1;
            continue;
        }

        const existingTransactionId = await findExistingGeneratedTransaction({
            workspaceId,
            debtId: debt._id,
            scheduledPaymentDate,
        });

        if (existingTransactionId) {
            const existingPaymentId = await findPaymentByTransactionId({
                workspaceId,
                transactionId: existingTransactionId,
            });
            const counters = getNextPlanCounters(debt);
            const nextDueDate = getNextDueDateAfterPayment(
                debt,
                scheduledPaymentDate,
                counters.remainingInstallments
            );

            if (!dryRun) {
                await DebtModel.updateOne(
                    {
                        _id: debt._id,
                        workspaceId,
                    },
                    {
                        $set: {
                            paidInstallments: counters.paidInstallments,
                            remainingInstallments: counters.remainingInstallments,
                            nextDueDate,
                            lastGeneratedTransactionId: existingTransactionId,
                            lastGeneratedPaymentId: existingPaymentId,
                        },
                    }
                );
            }

            const breakdown = getPaymentBreakdown(debt);

            items.push({
                debtId: debt._id,
                debtName: debt.description,
                scheduledPaymentDate,
                nextDueDate,
                action: "skipped_duplicate",
                reason: "Ya existía una transacción generada para esta deuda y fecha; se evita duplicar.",
                transactionId: existingTransactionId,
                paymentId: existingPaymentId,
                amount: breakdown.amount,
                principalAmount: breakdown.principalAmount,
                feeAmount: breakdown.feeAmount,
            });
            skippedCount += 1;
            continue;
        }

        const breakdown = getPaymentBreakdown(debt);
        const counters = getNextPlanCounters(debt);
        const nextDueDate = getNextDueDateAfterPayment(
            debt,
            scheduledPaymentDate,
            counters.remainingInstallments
        );

        if (dryRun) {
            items.push({
                debtId: debt._id,
                debtName: debt.description,
                scheduledPaymentDate,
                nextDueDate,
                action: "would_create",
                reason: null,
                transactionId: null,
                paymentId: null,
                amount: breakdown.amount,
                principalAmount: breakdown.principalAmount,
                feeAmount: breakdown.feeAmount,
            });
            continue;
        }

        const createdByUserId = input.createdByUserId ?? debt.memberId;

        if (!createdByUserId) {
            items.push(
                buildSkippedItem({
                    debt,
                    scheduledPaymentDate,
                    action: "skipped_missing_member",
                    reason: "No hay miembro disponible para crear la transacción.",
                })
            );
            skippedCount += 1;
            continue;
        }

        const generated = await createDebtPlanPayment({
            workspaceId,
            workspace,
            debt,
            scheduledPaymentDate,
            createdByUserId,
        });

        items.push({
            debtId: generated.debt._id,
            debtName: generated.debt.description,
            scheduledPaymentDate,
            nextDueDate: generated.debt.nextDueDate ?? null,
            action: "created",
            reason: null,
            transactionId: generated.transaction._id,
            paymentId: generated.payment._id,
            amount: breakdown.amount,
            principalAmount: breakdown.principalAmount,
            feeAmount: breakdown.feeAmount,
        });
        generatedCount += 1;
    }

    return {
        dryRun,
        asOfDate,
        scannedCount: dueDebts.length,
        dueCount: dueDebts.length,
        generatedCount,
        skippedCount,
        items,
    };
}