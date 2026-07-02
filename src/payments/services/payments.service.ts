// src/payments/services/payments.service.ts
// Service layer for debt payments.
// Fase 2 rule:
// - amount = real cashflow moved.
// - principalAmount = amount applied to reduce the debt.
// - feeAmount = fees, interests, commissions, or extra charges.
// - Debt sync must use principalAmount, never the full amount.

import { Types } from "mongoose";

import { AccountModel } from "@/src/accounts/models/Account.model";
import { CardModel } from "@/src/cards/models/Card.model";
import { DebtModel } from "@/src/debts/models/Debt.model";
import type { DebtDocument } from "@/src/debts/types/debts.types";
import type { CashflowDirection } from "@/src/shared/types/common";
import { TransactionModel } from "@/src/transactions/models/Transaction.model";
import type { TransactionDocument } from "@/src/transactions/types/transaction.types";
import { PaymentModel } from "../models/Payment.model";
import type {
    CreatePaymentServiceInput,
    DeletePaymentServiceInput,
    PaymentDocument,
    PaymentMethod,
    PaymentStatus,
    UpdatePaymentServiceInput,
} from "../types/payments.types";

type OptionalObjectId = Types.ObjectId | null;

type ResolvedPaymentAmounts = {
    amount: number;
    principalAmount: number;
    feeAmount: number;
};

type BuildPaymentPayloadInput = {
    debtId: Types.ObjectId;
    accountId: OptionalObjectId;
    cardId: OptionalObjectId;
    memberId: OptionalObjectId;
    transactionId: OptionalObjectId;
    amount: number;
    principalAmount: number;
    feeAmount: number;
    cashflowDirection: CashflowDirection;
    currency: PaymentDocument["currency"];
    paymentDate: Date;
    method: PaymentMethod | null;
    reference: string | null;
    notes: string | null;
    status: PaymentStatus;
    isVisible: boolean;
};

type PaymentWritePayload = {
    debtId: Types.ObjectId;
    accountId: OptionalObjectId;
    cardId: OptionalObjectId;
    memberId: OptionalObjectId;
    transactionId: OptionalObjectId;
    amount: number;
    principalAmount: number;
    feeAmount: number;
    cashflowDirection: CashflowDirection;
    currency: PaymentDocument["currency"];
    paymentDate: Date;
    method: PaymentMethod | null;
    reference: string | null;
    notes: string | null;
    status: PaymentStatus;
    isVisible: boolean;
};

class PaymentServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.name = "PaymentServiceError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

export function isPaymentServiceError(error: Error): error is PaymentServiceError {
    return error instanceof PaymentServiceError;
}

function normalizeNullableString(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}

function parseOptionalObjectId(value: string | null | undefined): OptionalObjectId {
    if (value === undefined || value === null) {
        return null;
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
        return null;
    }

    if (!Types.ObjectId.isValid(normalizedValue)) {
        throw new PaymentServiceError(
            "Uno de los ids enviados no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(normalizedValue);
}

function parseRequiredObjectId(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new PaymentServiceError(
            "Uno de los ids enviados no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(value);
}

function parsePaymentDate(value: string): Date {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        throw new PaymentServiceError(
            "La fecha de pago no es válida.",
            400,
            "INVALID_PAYMENT_DATE"
        );
    }

    return parsedDate;
}

function roundMoney(value: number): number {
    return Number(value.toFixed(2));
}

// Normalizes the payment breakdown.
// If only amount is received, the whole amount reduces debt by default.
// If fees are sent, principalAmount becomes amount - feeAmount.
// If principalAmount is sent, feeAmount becomes amount - principalAmount.
function resolvePaymentAmounts(input: {
    amount: number;
    principalAmount?: number;
    feeAmount?: number;
}): ResolvedPaymentAmounts {
    const amount = roundMoney(input.amount);
    const principalAmount = roundMoney(
        input.principalAmount !== undefined
            ? input.principalAmount
            : input.feeAmount !== undefined
                ? amount - input.feeAmount
                : amount
    );
    const feeAmount = roundMoney(
        input.feeAmount !== undefined
            ? input.feeAmount
            : input.principalAmount !== undefined
                ? amount - input.principalAmount
                : 0
    );

    if (amount <= 0) {
        throw new PaymentServiceError(
            "El monto del pago debe ser mayor a 0.",
            400,
            "INVALID_PAYMENT_AMOUNT"
        );
    }

    if (principalAmount < 0) {
        throw new PaymentServiceError(
            "El monto aplicado a deuda no puede ser menor a 0.",
            400,
            "INVALID_PAYMENT_PRINCIPAL_AMOUNT"
        );
    }

    if (feeAmount < 0) {
        throw new PaymentServiceError(
            "Los cargos, intereses o comisiones no pueden ser menores a 0.",
            400,
            "INVALID_PAYMENT_FEE_AMOUNT"
        );
    }

    if (roundMoney(principalAmount + feeAmount) !== amount) {
        throw new PaymentServiceError(
            "principalAmount más feeAmount debe coincidir con amount.",
            400,
            "PAYMENT_AMOUNT_BREAKDOWN_MISMATCH"
        );
    }

    return {
        amount,
        principalAmount,
        feeAmount,
    };
}

function resolvePaymentStatus(status: PaymentStatus | undefined): PaymentStatus {
    return status ?? "completed";
}

// A debt owed by me is money going out.
// A debt owed to me is money coming in.
function getDebtCashflowDirection(debt: DebtDocument): CashflowDirection {
    return debt.type === "owed_by_me" ? "out" : "in";
}

function assertRequestedCashflowDirectionMatchesDebt(args: {
    requestedCashflowDirection?: CashflowDirection;
    resolvedCashflowDirection: CashflowDirection;
}): void {
    const { requestedCashflowDirection, resolvedCashflowDirection } = args;

    if (
        requestedCashflowDirection !== undefined &&
        requestedCashflowDirection !== resolvedCashflowDirection
    ) {
        throw new PaymentServiceError(
            "El cashflowDirection del pago no coincide con el tipo de deuda relacionada.",
            400,
            "PAYMENT_CASHFLOW_DIRECTION_MISMATCH"
        );
    }
}

async function getDebtOrThrow(
    workspaceId: Types.ObjectId,
    debtId: Types.ObjectId
): Promise<DebtDocument> {
    const debt = await DebtModel.findOne({
        _id: debtId,
        workspaceId,
    }).lean<DebtDocument | null>();

    if (!debt) {
        throw new PaymentServiceError(
            "La deuda no fue encontrada.",
            404,
            "DEBT_NOT_FOUND"
        );
    }

    return debt;
}

async function validateAccountIfProvided(
    workspaceId: Types.ObjectId,
    accountId: OptionalObjectId
): Promise<void> {
    if (!accountId) {
        return;
    }

    const account = await AccountModel.exists({
        _id: accountId,
        workspaceId,
        isArchived: { $ne: true },
    });

    if (!account) {
        throw new PaymentServiceError(
            "La cuenta no fue encontrada en el workspace.",
            400,
            "ACCOUNT_NOT_FOUND"
        );
    }
}

async function validateCardIfProvided(
    workspaceId: Types.ObjectId,
    cardId: OptionalObjectId
): Promise<void> {
    if (!cardId) {
        return;
    }

    const card = await CardModel.exists({
        _id: cardId,
        workspaceId,
        isArchived: { $ne: true },
    });

    if (!card) {
        throw new PaymentServiceError(
            "La tarjeta no fue encontrada en el workspace.",
            400,
            "CARD_NOT_FOUND"
        );
    }
}

async function getTransactionIfProvided(
    workspaceId: Types.ObjectId,
    transactionId: OptionalObjectId
): Promise<TransactionDocument | null> {
    if (!transactionId) {
        return null;
    }

    const transaction = await TransactionModel.findOne({
        _id: transactionId,
        workspaceId,
        isArchived: { $ne: true },
    }).lean<TransactionDocument | null>();

    if (!transaction) {
        throw new PaymentServiceError(
            "La transacción no fue encontrada en el workspace.",
            400,
            "TRANSACTION_NOT_FOUND"
        );
    }

    if (transaction.type !== "debt_payment") {
        throw new PaymentServiceError(
            "La transacción relacionada debe ser de tipo debt_payment.",
            400,
            "INVALID_TRANSACTION_TYPE"
        );
    }

    return transaction;
}

async function getPaymentById(
    workspaceId: Types.ObjectId,
    paymentId: Types.ObjectId
): Promise<PaymentDocument | null> {
    return PaymentModel.findOne({
        _id: paymentId,
        workspaceId,
    }).lean<PaymentDocument | null>();
}

// Fase 2: debt sync uses principalAmount.
// Fallback to amount keeps old payments compatible until the backfill is done.
async function getCompletedPaymentsPrincipalTotalForDebt(
    workspaceId: Types.ObjectId,
    debtId: Types.ObjectId,
    excludePaymentId?: Types.ObjectId
): Promise<number> {
    const matchStage: {
        workspaceId: Types.ObjectId;
        debtId: Types.ObjectId;
        status: "completed";
        _id?: { $ne: Types.ObjectId };
    } = {
        workspaceId,
        debtId,
        status: "completed",
    };

    if (excludePaymentId) {
        matchStage._id = { $ne: excludePaymentId };
    }

    const result = await PaymentModel.aggregate<{
        totalPrincipalAmount: number;
    }>([
        {
            $match: matchStage,
        },
        {
            $group: {
                _id: null,
                totalPrincipalAmount: {
                    $sum: {
                        $ifNull: ["$principalAmount", "$amount"],
                    },
                },
            },
        },
    ]);

    return result[0]?.totalPrincipalAmount ?? 0;
}

function getResolvedDebtStatusFromPayments(
    debt: DebtDocument,
    remainingAmount: number
): DebtDocument["status"] {
    if (debt.status === "cancelled") {
        return "cancelled";
    }

    if (remainingAmount === 0) {
        return "paid";
    }

    if (debt.dueDate && debt.dueDate.getTime() < Date.now()) {
        return "overdue";
    }

    return "active";
}

// Recalculates debt.remainingAmount from completed payments.
// Important: it subtracts principalAmount only.
// Fees/interests/commissions do not reduce the debt balance.
async function syncDebtFromPayments(
    workspaceId: Types.ObjectId,
    debtId: Types.ObjectId
): Promise<void> {
    const debt = await DebtModel.findOne({
        _id: debtId,
        workspaceId,
    });

    if (!debt) {
        return;
    }

    const completedPaymentsPrincipalTotal = await getCompletedPaymentsPrincipalTotalForDebt(
        workspaceId,
        debtId
    );

    const remainingAmount = Math.max(
        0,
        roundMoney(debt.originalAmount - completedPaymentsPrincipalTotal)
    );

    const nextStatus = getResolvedDebtStatusFromPayments(
        {
            _id: debt._id,
            workspaceId: debt.workspaceId,
            memberId: debt.memberId ?? null,
            relatedAccountId: debt.relatedAccountId ?? null,
            type: debt.type,
            personName: debt.personName,
            personContact: debt.personContact ?? null,
            originalAmount: debt.originalAmount,
            remainingAmount: debt.remainingAmount,
            currency: debt.currency,
            description: debt.description,
            startDate: debt.startDate,
            dueDate: debt.dueDate ?? null,
            status: debt.status,
            notes: debt.notes ?? null,
            isVisible: debt.isVisible ?? true,
            createdAt: debt.createdAt,
            updatedAt: debt.updatedAt,
        },
        remainingAmount
    );

    debt.remainingAmount = remainingAmount;
    debt.status = nextStatus;

    await debt.save();
}

// Validates the payment against the debt using principalAmount.
// amount is not used here because fees are cashflow, not principal.
async function validatePaymentAgainstDebt(args: {
    workspaceId: Types.ObjectId;
    debt: DebtDocument;
    principalAmount: number;
    currency: PaymentDocument["currency"];
    status: PaymentStatus;
    excludePaymentId?: Types.ObjectId;
}): Promise<void> {
    const { workspaceId, debt, principalAmount, currency, status, excludePaymentId } = args;

    if (debt.status === "cancelled") {
        throw new PaymentServiceError(
            "No puedes registrar pagos sobre una deuda cancelada.",
            400,
            "DEBT_CANCELLED"
        );
    }

    if (currency !== debt.currency) {
        throw new PaymentServiceError(
            "La moneda del pago debe coincidir con la moneda de la deuda.",
            400,
            "CURRENCY_MISMATCH"
        );
    }

    if (status !== "completed" || principalAmount === 0) {
        return;
    }

    const otherCompletedPaymentsPrincipalTotal = await getCompletedPaymentsPrincipalTotalForDebt(
        workspaceId,
        debt._id,
        excludePaymentId
    );

    const remainingBeforeCurrentPayment = roundMoney(
        Math.max(0, debt.originalAmount - otherCompletedPaymentsPrincipalTotal)
    );

    if (remainingBeforeCurrentPayment <= 0) {
        throw new PaymentServiceError(
            "La deuda ya se encuentra pagada.",
            400,
            "DEBT_ALREADY_PAID"
        );
    }

    if (principalAmount > remainingBeforeCurrentPayment) {
        throw new PaymentServiceError(
            "El monto aplicado a deuda no puede exceder el saldo pendiente.",
            400,
            "PAYMENT_PRINCIPAL_EXCEEDS_DEBT_REMAINING"
        );
    }
}

function validateSourceCombination(
    accountId: OptionalObjectId,
    cardId: OptionalObjectId
): void {
    if (accountId && cardId) {
        throw new PaymentServiceError(
            "No puedes enviar accountId y cardId al mismo tiempo.",
            400,
            "INVALID_PAYMENT_SOURCE"
        );
    }
}

// Validates that a linked transaction matches the payment.
// It compares transaction.amount with payment.amount because transaction amount
// represents real cashflow moved, not principal reduction.
function validateTransactionConsistency(args: {
    transaction: TransactionDocument | null;
    debtId: Types.ObjectId;
    accountId: OptionalObjectId;
    cardId: OptionalObjectId;
    memberId: OptionalObjectId;
    amount: number;
    cashflowDirection: CashflowDirection;
    currency: PaymentDocument["currency"];
}): void {
    const {
        transaction,
        debtId,
        accountId,
        cardId,
        memberId,
        amount,
        cashflowDirection,
        currency,
    } = args;

    if (!transaction) {
        return;
    }

    if (roundMoney(transaction.amount) !== amount) {
        throw new PaymentServiceError(
            "El monto del pago debe coincidir con el monto de la transacción relacionada.",
            400,
            "TRANSACTION_AMOUNT_MISMATCH"
        );
    }

    if (transaction.currency !== currency) {
        throw new PaymentServiceError(
            "La moneda del pago debe coincidir con la moneda de la transacción relacionada.",
            400,
            "TRANSACTION_CURRENCY_MISMATCH"
        );
    }

    if (transaction.debtId && !transaction.debtId.equals(debtId)) {
        throw new PaymentServiceError(
            "La deuda del pago no coincide con la de la transacción relacionada.",
            400,
            "TRANSACTION_DEBT_MISMATCH"
        );
    }

    if (
        transaction.cashflowDirection !== undefined &&
        transaction.cashflowDirection !== null &&
        transaction.cashflowDirection !== cashflowDirection
    ) {
        throw new PaymentServiceError(
            "El cashflowDirection del pago no coincide con el de la transacción relacionada.",
            400,
            "TRANSACTION_CASHFLOW_DIRECTION_MISMATCH"
        );
    }

    if (accountId && transaction.accountId && !transaction.accountId.equals(accountId)) {
        throw new PaymentServiceError(
            "La cuenta del pago no coincide con la de la transacción relacionada.",
            400,
            "TRANSACTION_ACCOUNT_MISMATCH"
        );
    }

    if (cardId && transaction.cardId && !transaction.cardId.equals(cardId)) {
        throw new PaymentServiceError(
            "La tarjeta del pago no coincide con la de la transacción relacionada.",
            400,
            "TRANSACTION_CARD_MISMATCH"
        );
    }

    if (memberId && transaction.memberId && !transaction.memberId.equals(memberId)) {
        throw new PaymentServiceError(
            "El miembro del pago no coincide con el de la transacción relacionada.",
            400,
            "TRANSACTION_MEMBER_MISMATCH"
        );
    }
}

function buildPaymentPayload(input: BuildPaymentPayloadInput): PaymentWritePayload {
    return {
        debtId: input.debtId,
        accountId: input.accountId,
        cardId: input.cardId,
        memberId: input.memberId,
        transactionId: input.transactionId,
        amount: input.amount,
        principalAmount: input.principalAmount,
        feeAmount: input.feeAmount,
        cashflowDirection: input.cashflowDirection,
        currency: input.currency,
        paymentDate: input.paymentDate,
        method: input.method,
        reference: input.reference,
        notes: input.notes,
        status: input.status,
        isVisible: input.isVisible,
    };
}

export async function getPaymentsService(
    workspaceId: Types.ObjectId
): Promise<PaymentDocument[]> {
    return PaymentModel.find({
        workspaceId,
    })
        .sort({
            paymentDate: -1,
            createdAt: -1,
        })
        .lean<PaymentDocument[]>();
}

export async function getPaymentByIdService(
    workspaceId: Types.ObjectId,
    paymentId: Types.ObjectId
): Promise<PaymentDocument | null> {
    return getPaymentById(workspaceId, paymentId);
}

export async function createPaymentService(
    input: CreatePaymentServiceInput
): Promise<PaymentDocument> {
    const { workspaceId, body } = input;

    const debtId = parseRequiredObjectId(body.debtId);
    const accountId = parseOptionalObjectId(body.accountId);
    const cardId = parseOptionalObjectId(body.cardId);
    const memberId = parseOptionalObjectId(body.memberId);
    const transactionId = parseOptionalObjectId(body.transactionId);
    const paymentDate = parsePaymentDate(body.paymentDate);
    const status = resolvePaymentStatus(body.status);
    const paymentAmounts = resolvePaymentAmounts({
        amount: body.amount,
        principalAmount: body.principalAmount,
        feeAmount: body.feeAmount,
    });

    validateSourceCombination(accountId, cardId);

    await validateAccountIfProvided(workspaceId, accountId);
    await validateCardIfProvided(workspaceId, cardId);

    const debt = await getDebtOrThrow(workspaceId, debtId);
    const cashflowDirection = getDebtCashflowDirection(debt);

    assertRequestedCashflowDirectionMatchesDebt({
        requestedCashflowDirection: body.cashflowDirection,
        resolvedCashflowDirection: cashflowDirection,
    });

    await validatePaymentAgainstDebt({
        workspaceId,
        debt,
        principalAmount: paymentAmounts.principalAmount,
        currency: body.currency,
        status,
    });

    const transaction = await getTransactionIfProvided(workspaceId, transactionId);

    validateTransactionConsistency({
        transaction,
        debtId,
        accountId,
        cardId,
        memberId,
        amount: paymentAmounts.amount,
        cashflowDirection,
        currency: body.currency,
    });

    const payment = await PaymentModel.create({
        workspaceId,
        ...buildPaymentPayload({
            debtId,
            accountId,
            cardId,
            memberId,
            transactionId,
            amount: paymentAmounts.amount,
            principalAmount: paymentAmounts.principalAmount,
            feeAmount: paymentAmounts.feeAmount,
            cashflowDirection,
            currency: body.currency,
            paymentDate,
            method: body.method ?? null,
            reference: normalizeNullableString(body.reference),
            notes: normalizeNullableString(body.notes),
            status,
            isVisible: body.isVisible ?? true,
        }),
    });

    if (status === "completed") {
        await syncDebtFromPayments(workspaceId, debtId);
    }

    return {
        _id: payment._id,
        workspaceId: payment.workspaceId,
        debtId: payment.debtId,
        accountId: payment.accountId ?? null,
        cardId: payment.cardId ?? null,
        memberId: payment.memberId ?? null,
        transactionId: payment.transactionId ?? null,
        amount: payment.amount,
        principalAmount: payment.principalAmount,
        feeAmount: payment.feeAmount,
        cashflowDirection: payment.cashflowDirection,
        currency: payment.currency,
        paymentDate: payment.paymentDate,
        method: payment.method ?? null,
        reference: payment.reference ?? null,
        notes: payment.notes ?? null,
        status: payment.status,
        isVisible: payment.isVisible ?? true,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
    };
}

export async function updatePaymentService(
    input: UpdatePaymentServiceInput
): Promise<PaymentDocument | null> {
    const { workspaceId, paymentId, body } = input;

    const existingPayment = await getPaymentById(workspaceId, paymentId);

    if (!existingPayment) {
        return null;
    }

    const nextDebtId =
        body.debtId !== undefined ? parseRequiredObjectId(body.debtId) : existingPayment.debtId;

    const nextAccountId =
        body.accountId !== undefined
            ? parseOptionalObjectId(body.accountId)
            : existingPayment.accountId ?? null;

    const nextCardId =
        body.cardId !== undefined
            ? parseOptionalObjectId(body.cardId)
            : existingPayment.cardId ?? null;

    const nextMemberId =
        body.memberId !== undefined
            ? parseOptionalObjectId(body.memberId)
            : existingPayment.memberId ?? null;

    const nextTransactionId =
        body.transactionId !== undefined
            ? parseOptionalObjectId(body.transactionId)
            : existingPayment.transactionId ?? null;

    const nextAmount = body.amount !== undefined ? body.amount : existingPayment.amount;
    const shouldResetBreakdownFromAmount =
        body.amount !== undefined &&
        body.principalAmount === undefined &&
        body.feeAmount === undefined;
    const existingPrincipalAmount =
        existingPayment.principalAmount !== undefined
            ? existingPayment.principalAmount
            : existingPayment.amount;
    const existingFeeAmount =
        existingPayment.feeAmount !== undefined ? existingPayment.feeAmount : 0;
    const paymentAmounts = resolvePaymentAmounts({
        amount: nextAmount,
        principalAmount: shouldResetBreakdownFromAmount
            ? undefined
            : body.principalAmount !== undefined
                ? body.principalAmount
                : existingPrincipalAmount,
        feeAmount: shouldResetBreakdownFromAmount
            ? undefined
            : body.feeAmount !== undefined
                ? body.feeAmount
                : existingFeeAmount,
    });
    const nextCurrency =
        body.currency !== undefined ? body.currency : existingPayment.currency;
    const nextPaymentDate =
        body.paymentDate !== undefined
            ? parsePaymentDate(body.paymentDate)
            : existingPayment.paymentDate;
    const nextMethod =
        body.method !== undefined ? body.method : existingPayment.method ?? null;
    const nextReference =
        body.reference !== undefined
            ? normalizeNullableString(body.reference)
            : existingPayment.reference ?? null;
    const nextNotes =
        body.notes !== undefined
            ? normalizeNullableString(body.notes)
            : existingPayment.notes ?? null;
    const nextStatus =
        body.status !== undefined ? body.status : existingPayment.status;
    const nextIsVisible =
        body.isVisible !== undefined
            ? body.isVisible
            : existingPayment.isVisible ?? true;

    validateSourceCombination(nextAccountId, nextCardId);

    await validateAccountIfProvided(workspaceId, nextAccountId);
    await validateCardIfProvided(workspaceId, nextCardId);

    const nextDebt = await getDebtOrThrow(workspaceId, nextDebtId);
    const nextCashflowDirection = getDebtCashflowDirection(nextDebt);

    assertRequestedCashflowDirectionMatchesDebt({
        requestedCashflowDirection: body.cashflowDirection,
        resolvedCashflowDirection: nextCashflowDirection,
    });

    await validatePaymentAgainstDebt({
        workspaceId,
        debt: nextDebt,
        principalAmount: paymentAmounts.principalAmount,
        currency: nextCurrency,
        status: nextStatus,
        excludePaymentId: paymentId,
    });

    const transaction = await getTransactionIfProvided(workspaceId, nextTransactionId);

    validateTransactionConsistency({
        transaction,
        debtId: nextDebtId,
        accountId: nextAccountId,
        cardId: nextCardId,
        memberId: nextMemberId,
        amount: paymentAmounts.amount,
        cashflowDirection: nextCashflowDirection,
        currency: nextCurrency,
    });

    const updatedPayment = await PaymentModel.findOneAndUpdate(
        {
            _id: paymentId,
            workspaceId,
        },
        {
            $set: buildPaymentPayload({
                debtId: nextDebtId,
                accountId: nextAccountId,
                cardId: nextCardId,
                memberId: nextMemberId,
                transactionId: nextTransactionId,
                amount: paymentAmounts.amount,
                principalAmount: paymentAmounts.principalAmount,
                feeAmount: paymentAmounts.feeAmount,
                cashflowDirection: nextCashflowDirection,
                currency: nextCurrency,
                paymentDate: nextPaymentDate,
                method: nextMethod,
                reference: nextReference,
                notes: nextNotes,
                status: nextStatus,
                isVisible: nextIsVisible,
            }),
        },
        {
            new: true,
        }
    ).lean<PaymentDocument | null>();

    if (!updatedPayment) {
        return null;
    }

    await syncDebtFromPayments(workspaceId, existingPayment.debtId);

    if (!existingPayment.debtId.equals(nextDebtId)) {
        await syncDebtFromPayments(workspaceId, nextDebtId);
    }

    return updatedPayment;
}

export async function deletePaymentService(
    input: DeletePaymentServiceInput
): Promise<PaymentDocument | null> {
    const { workspaceId, paymentId } = input;

    const payment = await PaymentModel.findOneAndDelete({
        _id: paymentId,
        workspaceId,
    }).lean<PaymentDocument | null>();

    if (!payment) {
        return null;
    }

    await syncDebtFromPayments(workspaceId, payment.debtId);

    return payment;
}