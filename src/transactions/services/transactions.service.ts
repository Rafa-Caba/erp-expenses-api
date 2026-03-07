// src/transactions/services/transactions.service.ts

import { Types } from "mongoose";

import { TransactionModel } from "../models/Transaction.model";
import type {
    ArchiveTransactionServiceInput,
    CreateTransactionServiceInput,
    TransactionStatus,
    UpdateTransactionServiceInput,
    TransactionDocument,
} from "../types/transaction.types";

function normalizeNullableString(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}

function parseOptionalObjectId(value: string | null | undefined): Types.ObjectId | null {
    if (!value) {
        return null;
    }

    return new Types.ObjectId(value);
}

function parseRequiredObjectId(value: string): Types.ObjectId {
    return new Types.ObjectId(value);
}

function parseTransactionDate(value: string): Date {
    return new Date(value);
}

function isValidTransactionDate(value: Date): boolean {
    return !Number.isNaN(value.getTime());
}

export class TransactionServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.name = "TransactionServiceError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

export function isTransactionServiceError(error: Error): error is TransactionServiceError {
    return error instanceof TransactionServiceError;
}

async function findTransactionById(
    workspaceId: Types.ObjectId,
    transactionId: Types.ObjectId
): Promise<TransactionDocument | null> {
    return TransactionModel.findOne({
        _id: transactionId,
        workspaceId,
    }).lean<TransactionDocument | null>();
}

function validateBusinessRules(input: {
    accountId: Types.ObjectId | null;
    destinationAccountId: Types.ObjectId | null;
    cardId: Types.ObjectId | null;
    categoryId: Types.ObjectId | null;
    type: "expense" | "income" | "debt_payment" | "transfer" | "adjustment";
    isRecurring: boolean;
    recurrenceRule: string | null;
    amount: number;
    transactionDate: Date;
}): void {
    const {
        accountId,
        destinationAccountId,
        cardId,
        categoryId,
        type,
        isRecurring,
        recurrenceRule,
        amount,
        transactionDate,
    } = input;

    if (amount <= 0) {
        throw new TransactionServiceError(
            "El monto debe ser mayor a 0.",
            400,
            "INVALID_TRANSACTION_AMOUNT"
        );
    }

    if (!isValidTransactionDate(transactionDate)) {
        throw new TransactionServiceError(
            "La fecha de transacción no es válida.",
            400,
            "INVALID_TRANSACTION_DATE"
        );
    }

    if (isRecurring && !recurrenceRule) {
        throw new TransactionServiceError(
            "La regla de recurrencia es obligatoria cuando la transacción es recurrente.",
            400,
            "RECURRENCE_RULE_REQUIRED"
        );
    }

    if (!isRecurring && recurrenceRule) {
        throw new TransactionServiceError(
            "La regla de recurrencia solo aplica cuando la transacción es recurrente.",
            400,
            "RECURRENCE_RULE_NOT_ALLOWED"
        );
    }

    if (type === "transfer") {
        if (!accountId) {
            throw new TransactionServiceError(
                "La cuenta origen es obligatoria para transferencias.",
                400,
                "TRANSFER_SOURCE_ACCOUNT_REQUIRED"
            );
        }

        if (!destinationAccountId) {
            throw new TransactionServiceError(
                "La cuenta destino es obligatoria para transferencias.",
                400,
                "TRANSFER_DESTINATION_ACCOUNT_REQUIRED"
            );
        }

        if (accountId.equals(destinationAccountId)) {
            throw new TransactionServiceError(
                "La cuenta destino debe ser diferente a la cuenta origen.",
                400,
                "TRANSFER_ACCOUNTS_MUST_DIFFER"
            );
        }

        if (cardId) {
            throw new TransactionServiceError(
                "Las transferencias no deben incluir cardId.",
                400,
                "TRANSFER_CARD_NOT_ALLOWED"
            );
        }
    }

    if (type === "debt_payment") {
        if (!accountId) {
            throw new TransactionServiceError(
                "La cuenta es obligatoria para pagos de deuda.",
                400,
                "DEBT_PAYMENT_ACCOUNT_REQUIRED"
            );
        }

        if (!cardId) {
            throw new TransactionServiceError(
                "La tarjeta es obligatoria para pagos de deuda.",
                400,
                "DEBT_PAYMENT_CARD_REQUIRED"
            );
        }
    }

    if (type === "expense" || type === "income" || type === "adjustment") {
        if (!accountId && !cardId) {
            throw new TransactionServiceError(
                "Debes enviar accountId o cardId para este tipo de transacción.",
                400,
                "TRANSACTION_SOURCE_REQUIRED"
            );
        }

        if (!categoryId) {
            throw new TransactionServiceError(
                "La categoría es obligatoria para este tipo de transacción.",
                400,
                "TRANSACTION_CATEGORY_REQUIRED"
            );
        }

        if (destinationAccountId) {
            throw new TransactionServiceError(
                "destinationAccountId solo aplica a transacciones tipo transfer.",
                400,
                "DESTINATION_ACCOUNT_NOT_ALLOWED"
            );
        }
    }
}

export async function getTransactionsService(
    workspaceId: Types.ObjectId
): Promise<TransactionDocument[]> {
    return TransactionModel.find({
        workspaceId,
        isActive: true,
        isArchived: false,
    })
        .sort({
            transactionDate: -1,
            createdAt: -1,
        })
        .lean<TransactionDocument[]>();
}

export async function getTransactionByIdService(
    workspaceId: Types.ObjectId,
    transactionId: Types.ObjectId
): Promise<TransactionDocument | null> {
    return findTransactionById(workspaceId, transactionId);
}

export async function createTransactionService(
    input: CreateTransactionServiceInput
): Promise<TransactionDocument> {
    const { workspaceId, body } = input;

    const accountId = parseOptionalObjectId(body.accountId);
    const destinationAccountId = parseOptionalObjectId(body.destinationAccountId);
    const cardId = parseOptionalObjectId(body.cardId);
    const memberId = parseRequiredObjectId(body.memberId);
    const categoryId = parseOptionalObjectId(body.categoryId);
    const createdByUserId = parseRequiredObjectId(body.createdByUserId);
    const transactionDate = parseTransactionDate(body.transactionDate);
    const isRecurring = body.isRecurring ?? false;
    const recurrenceRule = normalizeNullableString(body.recurrenceRule);

    validateBusinessRules({
        accountId,
        destinationAccountId,
        cardId,
        categoryId,
        type: body.type,
        isRecurring,
        recurrenceRule,
        amount: body.amount,
        transactionDate,
    });

    const transaction = await TransactionModel.create({
        workspaceId,
        accountId,
        destinationAccountId,
        cardId,
        memberId,
        categoryId,
        type: body.type,
        amount: body.amount,
        currency: body.currency,
        description: body.description.trim(),
        merchant: normalizeNullableString(body.merchant),
        transactionDate,
        status: body.status ?? "posted",
        reference: normalizeNullableString(body.reference),
        notes: normalizeNullableString(body.notes),
        isRecurring,
        recurrenceRule,
        isActive: true,
        isArchived: false,
        isVisible: body.isVisible ?? true,
        createdByUserId,
    });

    return {
        _id: transaction._id,
        workspaceId: transaction.workspaceId,
        accountId: transaction.accountId ?? null,
        destinationAccountId: transaction.destinationAccountId ?? null,
        cardId: transaction.cardId ?? null,
        memberId: transaction.memberId,
        categoryId: transaction.categoryId ?? null,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        merchant: transaction.merchant ?? null,
        transactionDate: transaction.transactionDate,
        status: transaction.status as TransactionStatus,
        reference: transaction.reference ?? null,
        notes: transaction.notes ?? null,
        isRecurring: transaction.isRecurring ?? false,
        recurrenceRule: transaction.recurrenceRule ?? null,
        isActive: transaction.isActive,
        isArchived: transaction.isArchived ?? false,
        isVisible: transaction.isVisible ?? true,
        createdByUserId: transaction.createdByUserId,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
    };
}

export async function updateTransactionService(
    input: UpdateTransactionServiceInput
): Promise<TransactionDocument | null> {
    const { workspaceId, transactionId, body } = input;

    const existingTransaction = await findTransactionById(workspaceId, transactionId);

    if (!existingTransaction) {
        return null;
    }

    const nextAccountId =
        body.accountId !== undefined
            ? parseOptionalObjectId(body.accountId)
            : existingTransaction.accountId ?? null;

    const nextDestinationAccountId =
        body.destinationAccountId !== undefined
            ? parseOptionalObjectId(body.destinationAccountId)
            : existingTransaction.destinationAccountId ?? null;

    const nextCardId =
        body.cardId !== undefined
            ? parseOptionalObjectId(body.cardId)
            : existingTransaction.cardId ?? null;

    const nextMemberId =
        body.memberId !== undefined
            ? parseRequiredObjectId(body.memberId)
            : existingTransaction.memberId;

    const nextCategoryId =
        body.categoryId !== undefined
            ? parseOptionalObjectId(body.categoryId)
            : existingTransaction.categoryId ?? null;

    const nextType = body.type ?? existingTransaction.type;
    const nextAmount = body.amount ?? existingTransaction.amount;
    const nextTransactionDate =
        body.transactionDate !== undefined
            ? parseTransactionDate(body.transactionDate)
            : existingTransaction.transactionDate;
    const nextIsRecurring = body.isRecurring ?? (existingTransaction.isRecurring ?? false);
    const nextRecurrenceRule =
        body.recurrenceRule !== undefined
            ? normalizeNullableString(body.recurrenceRule)
            : existingTransaction.recurrenceRule ?? null;

    validateBusinessRules({
        accountId: nextAccountId,
        destinationAccountId: nextDestinationAccountId,
        cardId: nextCardId,
        categoryId: nextCategoryId,
        type: nextType,
        isRecurring: nextIsRecurring,
        recurrenceRule: nextRecurrenceRule,
        amount: nextAmount,
        transactionDate: nextTransactionDate,
    });

    const updatedTransaction = await TransactionModel.findOneAndUpdate(
        {
            _id: transactionId,
            workspaceId,
        },
        {
            $set: {
                accountId: nextAccountId,
                destinationAccountId: nextDestinationAccountId,
                cardId: nextCardId,
                memberId: nextMemberId,
                categoryId: nextCategoryId,
                type: nextType,
                amount: nextAmount,
                currency: body.currency ?? existingTransaction.currency,
                description:
                    body.description !== undefined
                        ? body.description.trim()
                        : existingTransaction.description,
                merchant:
                    body.merchant !== undefined
                        ? normalizeNullableString(body.merchant)
                        : existingTransaction.merchant ?? null,
                transactionDate: nextTransactionDate,
                status: body.status ?? existingTransaction.status,
                reference:
                    body.reference !== undefined
                        ? normalizeNullableString(body.reference)
                        : existingTransaction.reference ?? null,
                notes:
                    body.notes !== undefined
                        ? normalizeNullableString(body.notes)
                        : existingTransaction.notes ?? null,
                isRecurring: nextIsRecurring,
                recurrenceRule: nextRecurrenceRule,
                isActive:
                    body.isActive !== undefined ? body.isActive : existingTransaction.isActive,
                isArchived:
                    body.isArchived !== undefined
                        ? body.isArchived
                        : existingTransaction.isArchived ?? false,
                isVisible:
                    body.isVisible !== undefined
                        ? body.isVisible
                        : existingTransaction.isVisible ?? true,
            },
        },
        {
            new: true,
        }
    ).lean<TransactionDocument | null>();

    return updatedTransaction;
}

export async function archiveTransactionService(
    input: ArchiveTransactionServiceInput
): Promise<TransactionDocument | null> {
    const { workspaceId, transactionId } = input;

    const existingTransaction = await findTransactionById(workspaceId, transactionId);

    if (!existingTransaction) {
        return null;
    }

    const archivedTransaction = await TransactionModel.findOneAndUpdate(
        {
            _id: transactionId,
            workspaceId,
        },
        {
            $set: {
                isActive: false,
                isArchived: true,
            },
        },
        {
            new: true,
        }
    ).lean<TransactionDocument | null>();

    return archivedTransaction;
}