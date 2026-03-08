import { Types } from "mongoose";

import { AccountModel } from "@/src/accounts/models/Account.model";
import { CardModel } from "@/src/cards/models/Card.model";
import { DebtModel } from "@/src/debts/models/Debt.model";
import { PaymentModel } from "../models/Payment.model";
import { TransactionModel } from "@/src/transactions/models/Transaction.model";
import type {
    CreatePaymentServiceInput,
    DeletePaymentServiceInput,
    PaymentDocument,
    PaymentMethod,
    PaymentStatus,
    UpdatePaymentServiceInput,
} from "../types/payments.types";
import type { DebtDocument } from "@/src/debts/types/debts.types";
import type { TransactionDocument } from "@/src/transactions/types/transaction.types";

type OptionalObjectId = Types.ObjectId | null;

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

function validateAmount(amount: number): void {
    if (amount <= 0) {
        throw new PaymentServiceError(
            "El monto del pago debe ser mayor a 0.",
            400,
            "INVALID_PAYMENT_AMOUNT"
        );
    }
}

function resolvePaymentStatus(status: PaymentStatus | undefined): PaymentStatus {
    return status ?? "completed";
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

async function getCompletedPaymentsTotalForDebt(
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
        totalAmount: number;
    }>([
        {
            $match: matchStage,
        },
        {
            $group: {
                _id: null,
                totalAmount: {
                    $sum: "$amount",
                },
            },
        },
    ]);

    return result[0]?.totalAmount ?? 0;
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

    const completedPaymentsTotal = await getCompletedPaymentsTotalForDebt(
        workspaceId,
        debtId
    );

    const remainingAmount = Math.max(
        0,
        Number((debt.originalAmount - completedPaymentsTotal).toFixed(2))
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

async function validatePaymentAgainstDebt(args: {
    workspaceId: Types.ObjectId;
    debt: DebtDocument;
    amount: number;
    currency: PaymentDocument["currency"];
    status: PaymentStatus;
    excludePaymentId?: Types.ObjectId;
}): Promise<void> {
    const { workspaceId, debt, amount, currency, status, excludePaymentId } = args;

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

    if (status !== "completed") {
        return;
    }

    const otherCompletedPaymentsTotal = await getCompletedPaymentsTotalForDebt(
        workspaceId,
        debt._id,
        excludePaymentId
    );

    const remainingBeforeCurrentPayment = Number(
        Math.max(0, debt.originalAmount - otherCompletedPaymentsTotal).toFixed(2)
    );

    if (remainingBeforeCurrentPayment <= 0) {
        throw new PaymentServiceError(
            "La deuda ya se encuentra pagada.",
            400,
            "DEBT_ALREADY_PAID"
        );
    }

    if (amount > remainingBeforeCurrentPayment) {
        throw new PaymentServiceError(
            "El pago no puede exceder el saldo pendiente de la deuda.",
            400,
            "PAYMENT_EXCEEDS_DEBT_REMAINING"
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

function validateTransactionConsistency(args: {
    transaction: TransactionDocument | null;
    accountId: OptionalObjectId;
    cardId: OptionalObjectId;
    memberId: OptionalObjectId;
    amount: number;
    currency: PaymentDocument["currency"];
}): void {
    const { transaction, accountId, cardId, memberId, amount, currency } = args;

    if (!transaction) {
        return;
    }

    if (transaction.amount !== amount) {
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

type BuildPaymentPayloadInput = {
    debtId: Types.ObjectId;
    accountId: OptionalObjectId;
    cardId: OptionalObjectId;
    memberId: OptionalObjectId;
    transactionId: OptionalObjectId;
    amount: number;
    currency: PaymentDocument["currency"];
    paymentDate: Date;
    method: PaymentMethod | null;
    reference: string | null;
    notes: string | null;
    status: PaymentStatus;
    isVisible: boolean;
};

function buildPaymentPayload(input: BuildPaymentPayloadInput) {
    return {
        debtId: input.debtId,
        accountId: input.accountId,
        cardId: input.cardId,
        memberId: input.memberId,
        transactionId: input.transactionId,
        amount: input.amount,
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

    validateAmount(body.amount);
    validateSourceCombination(accountId, cardId);

    await validateAccountIfProvided(workspaceId, accountId);
    await validateCardIfProvided(workspaceId, cardId);

    const debt = await getDebtOrThrow(workspaceId, debtId);

    await validatePaymentAgainstDebt({
        workspaceId,
        debt,
        amount: body.amount,
        currency: body.currency,
        status,
    });

    const transaction = await getTransactionIfProvided(workspaceId, transactionId);

    validateTransactionConsistency({
        transaction,
        accountId,
        cardId,
        memberId,
        amount: body.amount,
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
            amount: body.amount,
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

    validateAmount(nextAmount);
    validateSourceCombination(nextAccountId, nextCardId);

    await validateAccountIfProvided(workspaceId, nextAccountId);
    await validateCardIfProvided(workspaceId, nextCardId);

    const nextDebt = await getDebtOrThrow(workspaceId, nextDebtId);

    await validatePaymentAgainstDebt({
        workspaceId,
        debt: nextDebt,
        amount: nextAmount,
        currency: nextCurrency,
        status: nextStatus,
        excludePaymentId: paymentId,
    });

    const transaction = await getTransactionIfProvided(workspaceId, nextTransactionId);

    validateTransactionConsistency({
        transaction,
        accountId: nextAccountId,
        cardId: nextCardId,
        memberId: nextMemberId,
        amount: nextAmount,
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
                amount: nextAmount,
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