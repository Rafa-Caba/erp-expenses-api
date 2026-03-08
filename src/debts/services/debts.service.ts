// src/debts/services/debts.service.ts

import { Types } from "mongoose";

import { DebtModel } from "../models/Debt.model";
import type {
    CreateDebtServiceInput,
    DebtDocument,
    DebtStatus,
    DeleteDebtServiceInput,
    UpdateDebtServiceInput,
} from "../types/debts.types";

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
    return DebtModel.find({
        workspaceId,
    })
        .sort({
            startDate: -1,
            createdAt: -1,
        })
        .lean<DebtDocument[]>();
}

export async function getDebtByIdService(
    workspaceId: Types.ObjectId,
    debtId: Types.ObjectId
): Promise<DebtDocument | null> {
    return findDebtById(workspaceId, debtId);
}

export async function createDebtService(
    input: CreateDebtServiceInput
): Promise<DebtDocument> {
    const { workspaceId, body } = input;

    const memberId = parseOptionalObjectId(body.memberId);
    const relatedAccountId = parseOptionalObjectId(body.relatedAccountId);
    const startDate = parseRequiredDate(body.startDate);
    const dueDate = parseOptionalDate(body.dueDate);

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
        notes: normalizeNullableString(body.notes),
        isVisible: body.isVisible ?? true,
    });

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
        notes: debt.notes ?? null,
        isVisible: debt.isVisible ?? true,
        createdAt: debt.createdAt,
        updatedAt: debt.updatedAt,
    };
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

    return updatedDebt;
}

export async function deleteDebtService(
    input: DeleteDebtServiceInput
): Promise<DebtDocument | null> {
    const { workspaceId, debtId } = input;

    return DebtModel.findOneAndDelete({
        _id: debtId,
        workspaceId,
    }).lean<DebtDocument | null>();
}