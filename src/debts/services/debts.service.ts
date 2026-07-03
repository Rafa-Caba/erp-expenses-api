// src/debts/services/debts.service.ts
// Debt service layer.
// Phase 10 adds expected principal/fee and auto-generation flags for debt plans.

import { Types } from "mongoose";

import { DebtModel } from "../models/Debt.model";
import type {
    CreateDebtBody,
    CreateDebtServiceInput,
    DebtDocument,
    DebtInstallmentFrequency,
    DebtStatus,
    DeleteDebtServiceInput,
    UpdateDebtBody,
    UpdateDebtServiceInput,
} from "../types/debts.types";

type NormalizedPaymentPlanFields = {
    paymentPlanEnabled: boolean;
    installmentAmount: number | null;
    expectedPrincipalAmount: number | null;
    expectedFeeAmount: number | null;
    installmentFrequency: DebtInstallmentFrequency | null;
    totalInstallments: number | null;
    paidInstallments: number | null;
    remainingInstallments: number | null;
    paymentDay: number | null;
    nextDueDate: Date | null;
    autoGeneratePayments: boolean;
};

function normalizeNullableString(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}

function parseOptionalObjectId(value: string | null | undefined): Types.ObjectId | null {
    if (value === undefined || value === null) {
        return null;
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
        return null;
    }

    if (!Types.ObjectId.isValid(normalizedValue)) {
        throw new DebtServiceError(
            "Uno de los ids enviados no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(normalizedValue);
}

function parseRequiredDate(value: string): Date {
    return new Date(value);
}

function parseOptionalDate(value: string | null | undefined): Date | null {
    if (value === undefined || value === null) {
        return null;
    }

    return new Date(value);
}

function isValidDate(value: Date): boolean {
    return !Number.isNaN(value.getTime());
}

function getNow(): Date {
    return new Date();
}

function roundMoney(value: number): number {
    return Number(value.toFixed(2));
}

function resolveDebtStatus(
    requestedStatus: DebtStatus | undefined,
    remainingAmount: number,
    dueDate: Date | null
): DebtStatus {
    if (requestedStatus === "cancelled") {
        return "cancelled";
    }

    if (remainingAmount === 0) {
        return "paid";
    }

    if (requestedStatus === "paid" && remainingAmount > 0) {
        throw new DebtServiceError(
            "Una deuda pagada debe tener monto restante igual a 0.",
            400,
            "INVALID_PAID_STATUS"
        );
    }

    if (dueDate && dueDate.getTime() < getNow().getTime()) {
        return "overdue";
    }

    return requestedStatus ?? "active";
}

function validateAmounts(originalAmount: number, remainingAmount: number): void {
    if (originalAmount <= 0) {
        throw new DebtServiceError(
            "El monto original debe ser mayor a 0.",
            400,
            "INVALID_ORIGINAL_AMOUNT"
        );
    }

    if (remainingAmount < 0) {
        throw new DebtServiceError(
            "El monto restante no puede ser menor a 0.",
            400,
            "INVALID_REMAINING_AMOUNT"
        );
    }

    if (remainingAmount > originalAmount) {
        throw new DebtServiceError(
            "El monto restante no puede ser mayor al monto original.",
            400,
            "REMAINING_AMOUNT_EXCEEDS_ORIGINAL"
        );
    }
}

function validateDates(startDate: Date, dueDate: Date | null): void {
    if (!isValidDate(startDate)) {
        throw new DebtServiceError(
            "La fecha de inicio no es válida.",
            400,
            "INVALID_START_DATE"
        );
    }

    if (dueDate !== null && !isValidDate(dueDate)) {
        throw new DebtServiceError(
            "La fecha de vencimiento no es válida.",
            400,
            "INVALID_DUE_DATE"
        );
    }

    if (dueDate !== null && dueDate.getTime() < startDate.getTime()) {
        throw new DebtServiceError(
            "La fecha de vencimiento no puede ser anterior a la fecha de inicio.",
            400,
            "INVALID_DATE_RANGE"
        );
    }
}

function normalizeOptionalPositiveNumber(value: number | null | undefined): number | null {
    if (value === undefined || value === null) {
        return null;
    }

    return roundMoney(value);
}

function normalizeOptionalNonNegativeNumber(value: number | null | undefined): number | null {
    if (value === undefined || value === null) {
        return null;
    }

    return roundMoney(value);
}

function normalizeOptionalInteger(value: number | null | undefined): number | null {
    if (value === undefined || value === null) {
        return null;
    }

    return Math.trunc(value);
}

function validatePaymentPlan(plan: NormalizedPaymentPlanFields): void {
    if (!plan.paymentPlanEnabled) {
        if (plan.autoGeneratePayments) {
            throw new DebtServiceError(
                "Para activar el motor de pagos vencidos, primero activa el plan de pagos.",
                400,
                "AUTO_GENERATE_REQUIRES_PAYMENT_PLAN"
            );
        }

        return;
    }

    if (plan.installmentAmount === null || plan.installmentAmount <= 0) {
        throw new DebtServiceError(
            "El monto por pago debe ser mayor a 0 cuando el plan de pagos está activo.",
            400,
            "INVALID_INSTALLMENT_AMOUNT"
        );
    }

    if (!plan.installmentFrequency) {
        throw new DebtServiceError(
            "La frecuencia es obligatoria cuando el plan de pagos está activo.",
            400,
            "INSTALLMENT_FREQUENCY_REQUIRED"
        );
    }

    if (plan.totalInstallments === null || plan.totalInstallments <= 0) {
        throw new DebtServiceError(
            "El total de pagos debe ser mayor a 0 cuando el plan de pagos está activo.",
            400,
            "INVALID_TOTAL_INSTALLMENTS"
        );
    }

    if (plan.paidInstallments === null || plan.paidInstallments < 0) {
        throw new DebtServiceError(
            "Los pagos realizados no pueden ser menores a 0.",
            400,
            "INVALID_PAID_INSTALLMENTS"
        );
    }

    if (plan.paidInstallments > plan.totalInstallments) {
        throw new DebtServiceError(
            "Los pagos realizados no pueden exceder el total.",
            400,
            "PAID_INSTALLMENTS_EXCEED_TOTAL"
        );
    }

    if (plan.paymentDay !== null && (plan.paymentDay < 1 || plan.paymentDay > 31)) {
        throw new DebtServiceError(
            "El día de pago debe estar entre 1 y 31.",
            400,
            "INVALID_PAYMENT_DAY"
        );
    }

    if (plan.nextDueDate !== null && !isValidDate(plan.nextDueDate)) {
        throw new DebtServiceError(
            "La fecha del siguiente pago no es válida.",
            400,
            "INVALID_NEXT_DUE_DATE"
        );
    }

    const expectedPrincipalAmount =
        plan.expectedPrincipalAmount ?? plan.installmentAmount;
    const expectedFeeAmount = plan.expectedFeeAmount ?? 0;

    if (expectedPrincipalAmount < 0 || expectedFeeAmount < 0) {
        throw new DebtServiceError(
            "El principal esperado y los cargos esperados no pueden ser negativos.",
            400,
            "INVALID_EXPECTED_PAYMENT_BREAKDOWN"
        );
    }

    if (roundMoney(expectedPrincipalAmount + expectedFeeAmount) !== plan.installmentAmount) {
        throw new DebtServiceError(
            "El principal esperado más cargos esperados debe coincidir con el monto por pago.",
            400,
            "EXPECTED_PAYMENT_BREAKDOWN_MISMATCH"
        );
    }

    if (plan.autoGeneratePayments && plan.nextDueDate === null) {
        throw new DebtServiceError(
            "Para incluir la deuda en el motor, necesitas definir el siguiente pago.",
            400,
            "AUTO_GENERATE_REQUIRES_NEXT_DUE_DATE"
        );
    }
}

function buildDisabledPaymentPlan(): NormalizedPaymentPlanFields {
    return {
        paymentPlanEnabled: false,
        installmentAmount: null,
        expectedPrincipalAmount: null,
        expectedFeeAmount: null,
        installmentFrequency: null,
        totalInstallments: null,
        paidInstallments: null,
        remainingInstallments: null,
        paymentDay: null,
        nextDueDate: null,
        autoGeneratePayments: false,
    };
}

function buildPaymentPlanFromCreateBody(body: CreateDebtBody): NormalizedPaymentPlanFields {
    const paymentPlanEnabled = body.paymentPlanEnabled ?? false;

    if (!paymentPlanEnabled) {
        return buildDisabledPaymentPlan();
    }

    const installmentAmount = normalizeOptionalPositiveNumber(body.installmentAmount);
    const expectedFeeAmount = normalizeOptionalNonNegativeNumber(body.expectedFeeAmount) ?? 0;
    const expectedPrincipalAmount =
        body.expectedPrincipalAmount !== undefined && body.expectedPrincipalAmount !== null
            ? normalizeOptionalNonNegativeNumber(body.expectedPrincipalAmount)
            : installmentAmount !== null
                ? roundMoney(installmentAmount - expectedFeeAmount)
                : null;
    const totalInstallments = normalizeOptionalInteger(body.totalInstallments);
    const paidInstallments = normalizeOptionalInteger(body.paidInstallments) ?? 0;
    const remainingInstallments =
        totalInstallments !== null ? Math.max(0, totalInstallments - paidInstallments) : null;

    const plan: NormalizedPaymentPlanFields = {
        paymentPlanEnabled,
        installmentAmount,
        expectedPrincipalAmount,
        expectedFeeAmount,
        installmentFrequency: body.installmentFrequency ?? null,
        totalInstallments,
        paidInstallments,
        remainingInstallments,
        paymentDay: normalizeOptionalInteger(body.paymentDay),
        nextDueDate: parseOptionalDate(body.nextDueDate),
        autoGeneratePayments: body.autoGeneratePayments ?? false,
    };

    validatePaymentPlan(plan);

    return plan;
}

function buildPaymentPlanFromUpdateBody(
    body: UpdateDebtBody,
    existingDebt: DebtDocument
): NormalizedPaymentPlanFields {
    const paymentPlanEnabled =
        body.paymentPlanEnabled !== undefined
            ? body.paymentPlanEnabled
            : existingDebt.paymentPlanEnabled ?? false;

    if (!paymentPlanEnabled) {
        return buildDisabledPaymentPlan();
    }

    const installmentAmount =
        body.installmentAmount !== undefined
            ? normalizeOptionalPositiveNumber(body.installmentAmount)
            : existingDebt.installmentAmount ?? null;
    const expectedFeeAmount =
        body.expectedFeeAmount !== undefined
            ? normalizeOptionalNonNegativeNumber(body.expectedFeeAmount)
            : existingDebt.expectedFeeAmount ?? 0;
    const expectedPrincipalAmount =
        body.expectedPrincipalAmount !== undefined
            ? normalizeOptionalNonNegativeNumber(body.expectedPrincipalAmount)
            : existingDebt.expectedPrincipalAmount ??
            (installmentAmount !== null
                ? roundMoney(installmentAmount - (expectedFeeAmount ?? 0))
                : null);
    const totalInstallments =
        body.totalInstallments !== undefined
            ? normalizeOptionalInteger(body.totalInstallments)
            : existingDebt.totalInstallments ?? null;
    const paidInstallments =
        body.paidInstallments !== undefined
            ? normalizeOptionalInteger(body.paidInstallments) ?? 0
            : existingDebt.paidInstallments ?? 0;
    const remainingInstallments =
        totalInstallments !== null ? Math.max(0, totalInstallments - paidInstallments) : null;

    const plan: NormalizedPaymentPlanFields = {
        paymentPlanEnabled,
        installmentAmount,
        expectedPrincipalAmount,
        expectedFeeAmount,
        installmentFrequency:
            body.installmentFrequency !== undefined
                ? body.installmentFrequency
                : existingDebt.installmentFrequency ?? null,
        totalInstallments,
        paidInstallments,
        remainingInstallments,
        paymentDay:
            body.paymentDay !== undefined
                ? normalizeOptionalInteger(body.paymentDay)
                : existingDebt.paymentDay ?? null,
        nextDueDate:
            body.nextDueDate !== undefined
                ? parseOptionalDate(body.nextDueDate)
                : existingDebt.nextDueDate ?? null,
        autoGeneratePayments:
            body.autoGeneratePayments !== undefined
                ? body.autoGeneratePayments
                : existingDebt.autoGeneratePayments ?? false,
    };

    validatePaymentPlan(plan);

    return plan;
}

function toDebtDocumentPayload(debt: DebtDocument): DebtDocument {
    return {
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
        paymentPlanEnabled: debt.paymentPlanEnabled ?? false,
        installmentAmount: debt.installmentAmount ?? null,
        expectedPrincipalAmount: debt.expectedPrincipalAmount ?? null,
        expectedFeeAmount: debt.expectedFeeAmount ?? null,
        installmentFrequency: debt.installmentFrequency ?? null,
        totalInstallments: debt.totalInstallments ?? null,
        paidInstallments: debt.paidInstallments ?? null,
        remainingInstallments: debt.remainingInstallments ?? null,
        paymentDay: debt.paymentDay ?? null,
        nextDueDate: debt.nextDueDate ?? null,
        autoGeneratePayments: debt.autoGeneratePayments ?? false,
        lastGeneratedPaymentId: debt.lastGeneratedPaymentId ?? null,
        lastGeneratedTransactionId: debt.lastGeneratedTransactionId ?? null,
        notes: debt.notes ?? null,
        isVisible: debt.isVisible ?? true,
        createdAt: debt.createdAt,
        updatedAt: debt.updatedAt,
    };
}

async function findDebtById(
    workspaceId: Types.ObjectId,
    debtId: Types.ObjectId
): Promise<DebtDocument | null> {
    return DebtModel.findOne({
        _id: debtId,
        workspaceId,
    }).lean<DebtDocument | null>();
}

export class DebtServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.name = "DebtServiceError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

export function isDebtServiceError(error: Error): error is DebtServiceError {
    return error instanceof DebtServiceError;
}

export async function getDebtsService(
    workspaceId: Types.ObjectId
): Promise<DebtDocument[]> {
    const debts = await DebtModel.find({
        workspaceId,
    })
        .sort({
            startDate: -1,
            createdAt: -1,
        })
        .lean<DebtDocument[]>();

    return debts.map(toDebtDocumentPayload);
}

export async function getDebtByIdService(
    workspaceId: Types.ObjectId,
    debtId: Types.ObjectId
): Promise<DebtDocument | null> {
    const debt = await findDebtById(workspaceId, debtId);

    return debt ? toDebtDocumentPayload(debt) : null;
}

export async function createDebtService(
    input: CreateDebtServiceInput
): Promise<DebtDocument> {
    const { workspaceId, body } = input;

    const memberId = parseOptionalObjectId(body.memberId);
    const relatedAccountId = parseOptionalObjectId(body.relatedAccountId);
    const startDate = parseRequiredDate(body.startDate);
    const dueDate = parseOptionalDate(body.dueDate);
    const paymentPlan = buildPaymentPlanFromCreateBody(body);

    validateAmounts(body.originalAmount, body.remainingAmount);
    validateDates(startDate, dueDate);

    const resolvedStatus = resolveDebtStatus(
        body.status,
        body.remainingAmount,
        dueDate
    );

    const debt = await DebtModel.create({
        workspaceId,
        memberId,
        relatedAccountId,
        type: body.type,
        personName: body.personName.trim(),
        personContact: normalizeNullableString(body.personContact),
        originalAmount: body.originalAmount,
        remainingAmount: body.remainingAmount,
        currency: body.currency,
        description: body.description.trim(),
        startDate,
        dueDate,
        status: resolvedStatus,
        ...paymentPlan,
        lastGeneratedPaymentId: null,
        lastGeneratedTransactionId: null,
        notes: normalizeNullableString(body.notes),
        isVisible: body.isVisible ?? true,
    });

    return toDebtDocumentPayload({
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
        paymentPlanEnabled: debt.paymentPlanEnabled,
        installmentAmount: debt.installmentAmount ?? null,
        expectedPrincipalAmount: debt.expectedPrincipalAmount ?? null,
        expectedFeeAmount: debt.expectedFeeAmount ?? null,
        installmentFrequency: debt.installmentFrequency ?? null,
        totalInstallments: debt.totalInstallments ?? null,
        paidInstallments: debt.paidInstallments ?? null,
        remainingInstallments: debt.remainingInstallments ?? null,
        paymentDay: debt.paymentDay ?? null,
        nextDueDate: debt.nextDueDate ?? null,
        autoGeneratePayments: debt.autoGeneratePayments ?? false,
        lastGeneratedPaymentId: debt.lastGeneratedPaymentId ?? null,
        lastGeneratedTransactionId: debt.lastGeneratedTransactionId ?? null,
        notes: debt.notes ?? null,
        isVisible: debt.isVisible ?? true,
        createdAt: debt.createdAt,
        updatedAt: debt.updatedAt,
    });
}

export async function updateDebtService(
    input: UpdateDebtServiceInput
): Promise<DebtDocument | null> {
    const { workspaceId, debtId, body } = input;

    const existingDebt = await findDebtById(workspaceId, debtId);

    if (!existingDebt) {
        return null;
    }

    const nextOriginalAmount =
        body.originalAmount !== undefined
            ? body.originalAmount
            : existingDebt.originalAmount;

    const nextRemainingAmount =
        body.remainingAmount !== undefined
            ? body.remainingAmount
            : existingDebt.remainingAmount;

    const nextStartDate =
        body.startDate !== undefined
            ? parseRequiredDate(body.startDate)
            : existingDebt.startDate;

    const nextDueDate =
        body.dueDate !== undefined
            ? parseOptionalDate(body.dueDate)
            : existingDebt.dueDate ?? null;

    const paymentPlan = buildPaymentPlanFromUpdateBody(body, existingDebt);

    validateAmounts(nextOriginalAmount, nextRemainingAmount);
    validateDates(nextStartDate, nextDueDate);

    const nextStatus = resolveDebtStatus(
        body.status !== undefined ? body.status : existingDebt.status,
        nextRemainingAmount,
        nextDueDate
    );

    const updatedDebt = await DebtModel.findOneAndUpdate(
        {
            _id: debtId,
            workspaceId,
        },
        {
            $set: {
                memberId:
                    body.memberId !== undefined
                        ? parseOptionalObjectId(body.memberId)
                        : existingDebt.memberId ?? null,
                relatedAccountId:
                    body.relatedAccountId !== undefined
                        ? parseOptionalObjectId(body.relatedAccountId)
                        : existingDebt.relatedAccountId ?? null,
                type: body.type !== undefined ? body.type : existingDebt.type,
                personName:
                    body.personName !== undefined
                        ? body.personName.trim()
                        : existingDebt.personName,
                personContact:
                    body.personContact !== undefined
                        ? normalizeNullableString(body.personContact)
                        : existingDebt.personContact ?? null,
                originalAmount: nextOriginalAmount,
                remainingAmount: nextRemainingAmount,
                currency: body.currency !== undefined ? body.currency : existingDebt.currency,
                description:
                    body.description !== undefined
                        ? body.description.trim()
                        : existingDebt.description,
                startDate: nextStartDate,
                dueDate: nextDueDate,
                status: nextStatus,
                ...paymentPlan,
                notes:
                    body.notes !== undefined
                        ? normalizeNullableString(body.notes)
                        : existingDebt.notes ?? null,
                isVisible:
                    body.isVisible !== undefined
                        ? body.isVisible
                        : existingDebt.isVisible ?? true,
            },
        },
        {
            new: true,
        }
    ).lean<DebtDocument | null>();

    return updatedDebt ? toDebtDocumentPayload(updatedDebt) : null;
}

export async function deleteDebtService(
    input: DeleteDebtServiceInput
): Promise<DebtDocument | null> {
    const { workspaceId, debtId } = input;

    const debt = await DebtModel.findOneAndDelete({
        _id: debtId,
        workspaceId,
    }).lean<DebtDocument | null>();

    return debt ? toDebtDocumentPayload(debt) : null;
}