// src/subscriptions/services/subscriptions.service.ts
// Subscription service layer.
// Phase 9A adds CRUD for recurring expenses and a reviewed action that creates
// one expense transaction from a subscription.
// Phase 9B adds the recurring engine: it can preview or generate due
// transactions for active subscriptions marked with autoCreateTransaction.

import { Types } from "mongoose";

import { AccountModel } from "@/src/accounts/models/Account.model";
import { CardModel } from "@/src/cards/models/Card.model";
import { CategoryModel } from "@/src/categories/models/Category.model";
import { TransactionModel } from "@/src/transactions/models/Transaction.model";
import { createTransactionService } from "@/src/transactions/services/transactions.service";
import type { TransactionDocument } from "@/src/transactions/types/transaction.types";
import { WorkspaceMemberModel } from "@/src/workspaces/models/WorkspaceMember.model";
import { SubscriptionModel } from "../models/Subscription.model";
import type {
    CreateSubscriptionServiceInput,
    CreateSubscriptionTransactionServiceInput,
    DeleteSubscriptionServiceInput,
    ProcessDueSubscriptionItem,
    ProcessDueSubscriptionsResult,
    ProcessDueSubscriptionsServiceInput,
    SubscriptionBillingFrequency,
    SubscriptionDocument,
    SubscriptionTransactionResult,
    UpdateSubscriptionServiceInput,
} from "../types/subscription.types";

class SubscriptionServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.name = "SubscriptionServiceError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

export function isSubscriptionServiceError(error: Error): error is SubscriptionServiceError {
    return error instanceof SubscriptionServiceError;
}

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
        throw new SubscriptionServiceError(
            "Uno de los ids enviados no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(normalizedValue);
}

function parseRequiredObjectId(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new SubscriptionServiceError(
            "Uno de los ids enviados no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(value);
}

function parseRequiredDate(value: string): Date {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        throw new SubscriptionServiceError(
            "La fecha enviada no es válida.",
            400,
            "INVALID_DATE"
        );
    }

    return parsedDate;
}

function parseOptionalDate(value: string | null | undefined): Date | null {
    if (value === undefined || value === null) {
        return null;
    }

    return parseRequiredDate(value);
}

function roundMoney(value: number): number {
    return Number(value.toFixed(2));
}

function clampDay(year: number, monthIndex: number, day: number): number {
    return Math.min(day, new Date(year, monthIndex + 1, 0).getDate());
}

function addBillingFrequency(
    date: Date,
    frequency: SubscriptionBillingFrequency,
    billingDay: number | null
): Date {
    const base = new Date(date);
    const year = base.getFullYear();
    const monthIndex = base.getMonth();
    const day = billingDay ?? base.getDate();

    if (frequency === "weekly") {
        base.setDate(base.getDate() + 7);
        return base;
    }

    if (frequency === "biweekly") {
        base.setDate(base.getDate() + 14);
        return base;
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

function validateDates(input: {
    startDate: Date;
    nextBillingDate: Date;
    endDate: Date | null;
}): void {
    const { startDate, nextBillingDate, endDate } = input;

    if (nextBillingDate.getTime() < startDate.getTime()) {
        throw new SubscriptionServiceError(
            "El próximo cobro no puede ser anterior a la fecha de inicio.",
            400,
            "NEXT_BILLING_BEFORE_START"
        );
    }

    if (endDate && endDate.getTime() < startDate.getTime()) {
        throw new SubscriptionServiceError(
            "La fecha final no puede ser anterior a la fecha de inicio.",
            400,
            "END_DATE_BEFORE_START"
        );
    }
}

function validateSourceCombination(
    accountId: Types.ObjectId | null,
    cardId: Types.ObjectId | null
): void {
    if (!accountId && !cardId) {
        throw new SubscriptionServiceError(
            "Debes seleccionar una cuenta o tarjeta para la suscripción.",
            400,
            "SUBSCRIPTION_SOURCE_REQUIRED"
        );
    }

    if (accountId && cardId) {
        throw new SubscriptionServiceError(
            "No puedes usar cuenta y tarjeta al mismo tiempo como fuente de la suscripción.",
            400,
            "SUBSCRIPTION_SOURCE_CONFLICT"
        );
    }
}

async function validateMember(
    workspaceId: Types.ObjectId,
    memberId: Types.ObjectId
): Promise<void> {
    const member = await WorkspaceMemberModel.exists({
        _id: memberId,
        workspaceId,
        status: "active",
    });

    if (!member) {
        throw new SubscriptionServiceError(
            "El miembro seleccionado no existe o no está activo en el workspace.",
            400,
            "SUBSCRIPTION_MEMBER_NOT_FOUND"
        );
    }
}

async function validateCategory(
    workspaceId: Types.ObjectId,
    categoryId: Types.ObjectId
): Promise<void> {
    const category = await CategoryModel.exists({
        _id: categoryId,
        workspaceId,
        type: { $in: ["EXPENSE", "BOTH"] },
        isActive: true,
    });

    if (!category) {
        throw new SubscriptionServiceError(
            "La categoría debe existir en el workspace y ser de tipo gasto o ambos.",
            400,
            "SUBSCRIPTION_CATEGORY_NOT_FOUND"
        );
    }
}

async function validateAccountIfProvided(
    workspaceId: Types.ObjectId,
    accountId: Types.ObjectId | null
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
        throw new SubscriptionServiceError(
            "La cuenta seleccionada no existe en el workspace.",
            400,
            "SUBSCRIPTION_ACCOUNT_NOT_FOUND"
        );
    }
}

async function validateCardIfProvided(
    workspaceId: Types.ObjectId,
    cardId: Types.ObjectId | null
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
        throw new SubscriptionServiceError(
            "La tarjeta seleccionada no existe en el workspace.",
            400,
            "SUBSCRIPTION_CARD_NOT_FOUND"
        );
    }
}

function toSubscriptionPayload(subscription: SubscriptionDocument): SubscriptionDocument {
    return {
        _id: subscription._id,
        workspaceId: subscription.workspaceId,
        memberId: subscription.memberId,
        categoryId: subscription.categoryId,
        accountId: subscription.accountId ?? null,
        cardId: subscription.cardId ?? null,
        name: subscription.name,
        merchant: subscription.merchant ?? null,
        amount: subscription.amount,
        currency: subscription.currency,
        billingFrequency: subscription.billingFrequency,
        billingDay: subscription.billingDay ?? null,
        startDate: subscription.startDate,
        nextBillingDate: subscription.nextBillingDate,
        endDate: subscription.endDate ?? null,
        status: subscription.status,
        autoCreateTransaction: subscription.autoCreateTransaction,
        lastTransactionId: subscription.lastTransactionId ?? null,
        notes: subscription.notes ?? null,
        isVisible: subscription.isVisible,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
    };
}

async function findSubscriptionById(
    workspaceId: Types.ObjectId,
    subscriptionId: Types.ObjectId
): Promise<SubscriptionDocument | null> {
    return SubscriptionModel.findOne({
        _id: subscriptionId,
        workspaceId,
    }).lean<SubscriptionDocument | null>();
}

function toDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
}

function buildGeneratedTransactionReference(
    subscriptionId: Types.ObjectId,
    billingDate: Date
): string {
    return `subscription:${subscriptionId.toString()}:${toDateOnly(billingDate)}`;
}

function buildGeneratedTransactionNotes(subscription: SubscriptionDocument): string {
    return `Generada desde suscripción: ${subscription.name}`;
}

async function findExistingGeneratedTransaction(args: {
    workspaceId: Types.ObjectId;
    subscriptionId: Types.ObjectId;
    billingDate: Date;
}): Promise<TransactionDocument | null> {
    const reference = buildGeneratedTransactionReference(
        args.subscriptionId,
        args.billingDate
    );

    return TransactionModel.findOne({
        workspaceId: args.workspaceId,
        reference,
        isArchived: { $ne: true },
    }).lean<TransactionDocument | null>();
}

async function createGeneratedTransactionFromSubscription(args: {
    workspaceId: Types.ObjectId;
    workspace: CreateSubscriptionTransactionServiceInput["workspace"];
    subscription: SubscriptionDocument;
    billingDate: Date;
    createdByUserId: Types.ObjectId;
    status?: "pending" | "posted" | "cancelled";
    reference?: string | null;
    notes?: string | null;
}): Promise<TransactionDocument> {
    const reference =
        normalizeNullableString(args.reference) ??
        buildGeneratedTransactionReference(args.subscription._id, args.billingDate);
    const notes = normalizeNullableString(args.notes) ?? buildGeneratedTransactionNotes(args.subscription);

    return createTransactionService({
        workspaceId: args.workspaceId,
        workspace: args.workspace,
        body: {
            accountId: args.subscription.accountId?.toString() ?? null,
            destinationAccountId: null,
            cardId: args.subscription.cardId?.toString() ?? null,
            debtId: null,
            memberId: args.subscription.memberId.toString(),
            categoryId: args.subscription.categoryId.toString(),
            type: "expense",
            cashflowDirection: "out",
            amount: args.subscription.amount,
            currency: args.subscription.currency,
            description: `Suscripción: ${args.subscription.name}`,
            merchant: args.subscription.merchant ?? args.subscription.name,
            transactionDate: args.billingDate.toISOString(),
            status: args.status ?? "posted",
            reference,
            notes,
            isRecurring: false,
            recurrenceRule: null,
            isVisible: true,
            createdByUserId: args.createdByUserId.toString(),
        },
    });
}

async function advanceSubscriptionAfterTransaction(args: {
    workspaceId: Types.ObjectId;
    subscription: SubscriptionDocument;
    billingDate: Date;
    transactionId: Types.ObjectId;
}): Promise<SubscriptionDocument> {
    const nextBillingDate = addBillingFrequency(
        args.billingDate,
        args.subscription.billingFrequency,
        args.subscription.billingDay ?? null
    );

    const updatedSubscription = await SubscriptionModel.findOneAndUpdate(
        {
            _id: args.subscription._id,
            workspaceId: args.workspaceId,
        },
        {
            $set: {
                lastTransactionId: args.transactionId,
                nextBillingDate,
            },
        },
        { new: true }
    ).lean<SubscriptionDocument | null>();

    if (!updatedSubscription) {
        throw new SubscriptionServiceError(
            "No fue posible actualizar la suscripción después de crear la transacción.",
            500,
            "SUBSCRIPTION_UPDATE_AFTER_TRANSACTION_FAILED"
        );
    }

    return toSubscriptionPayload(updatedSubscription);
}

export async function getSubscriptionsService(
    workspaceId: Types.ObjectId
): Promise<SubscriptionDocument[]> {
    const subscriptions = await SubscriptionModel.find({ workspaceId })
        .sort({ nextBillingDate: 1, createdAt: -1 })
        .lean<SubscriptionDocument[]>();

    return subscriptions.map(toSubscriptionPayload);
}

export async function getSubscriptionByIdService(
    workspaceId: Types.ObjectId,
    subscriptionId: Types.ObjectId
): Promise<SubscriptionDocument | null> {
    const subscription = await findSubscriptionById(workspaceId, subscriptionId);

    return subscription ? toSubscriptionPayload(subscription) : null;
}

export async function createSubscriptionService(
    input: CreateSubscriptionServiceInput
): Promise<SubscriptionDocument> {
    const { workspaceId, body } = input;

    const memberId = parseRequiredObjectId(body.memberId);
    const categoryId = parseRequiredObjectId(body.categoryId);
    const accountId = parseOptionalObjectId(body.accountId);
    const cardId = parseOptionalObjectId(body.cardId);
    const startDate = parseRequiredDate(body.startDate);
    const nextBillingDate = parseRequiredDate(body.nextBillingDate);
    const endDate = parseOptionalDate(body.endDate);

    validateSourceCombination(accountId, cardId);
    validateDates({ startDate, nextBillingDate, endDate });

    await validateMember(workspaceId, memberId);
    await validateCategory(workspaceId, categoryId);
    await validateAccountIfProvided(workspaceId, accountId);
    await validateCardIfProvided(workspaceId, cardId);

    const subscription = await SubscriptionModel.create({
        workspaceId,
        memberId,
        categoryId,
        accountId,
        cardId,
        name: body.name.trim(),
        merchant: normalizeNullableString(body.merchant),
        amount: roundMoney(body.amount),
        currency: body.currency,
        billingFrequency: body.billingFrequency,
        billingDay: body.billingDay ?? null,
        startDate,
        nextBillingDate,
        endDate,
        status: body.status ?? "active",
        autoCreateTransaction: body.autoCreateTransaction ?? false,
        lastTransactionId: null,
        notes: normalizeNullableString(body.notes),
        isVisible: body.isVisible ?? true,
    });

    return toSubscriptionPayload({
        _id: subscription._id,
        workspaceId: subscription.workspaceId,
        memberId: subscription.memberId,
        categoryId: subscription.categoryId,
        accountId: subscription.accountId ?? null,
        cardId: subscription.cardId ?? null,
        name: subscription.name,
        merchant: subscription.merchant ?? null,
        amount: subscription.amount,
        currency: subscription.currency,
        billingFrequency: subscription.billingFrequency,
        billingDay: subscription.billingDay ?? null,
        startDate: subscription.startDate,
        nextBillingDate: subscription.nextBillingDate,
        endDate: subscription.endDate ?? null,
        status: subscription.status,
        autoCreateTransaction: subscription.autoCreateTransaction,
        lastTransactionId: subscription.lastTransactionId ?? null,
        notes: subscription.notes ?? null,
        isVisible: subscription.isVisible,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
    });
}

export async function updateSubscriptionService(
    input: UpdateSubscriptionServiceInput
): Promise<SubscriptionDocument | null> {
    const { workspaceId, subscriptionId, body } = input;

    const existingSubscription = await findSubscriptionById(workspaceId, subscriptionId);

    if (!existingSubscription) {
        return null;
    }

    const nextMemberId =
        body.memberId !== undefined
            ? parseRequiredObjectId(body.memberId)
            : existingSubscription.memberId;
    const nextCategoryId =
        body.categoryId !== undefined
            ? parseRequiredObjectId(body.categoryId)
            : existingSubscription.categoryId;
    const nextAccountId =
        body.accountId !== undefined
            ? parseOptionalObjectId(body.accountId)
            : existingSubscription.accountId ?? null;
    const nextCardId =
        body.cardId !== undefined
            ? parseOptionalObjectId(body.cardId)
            : existingSubscription.cardId ?? null;
    const nextStartDate =
        body.startDate !== undefined
            ? parseRequiredDate(body.startDate)
            : existingSubscription.startDate;
    const nextNextBillingDate =
        body.nextBillingDate !== undefined
            ? parseRequiredDate(body.nextBillingDate)
            : existingSubscription.nextBillingDate;
    const nextEndDate =
        body.endDate !== undefined
            ? parseOptionalDate(body.endDate)
            : existingSubscription.endDate ?? null;

    validateSourceCombination(nextAccountId, nextCardId);
    validateDates({
        startDate: nextStartDate,
        nextBillingDate: nextNextBillingDate,
        endDate: nextEndDate,
    });

    await validateMember(workspaceId, nextMemberId);
    await validateCategory(workspaceId, nextCategoryId);
    await validateAccountIfProvided(workspaceId, nextAccountId);
    await validateCardIfProvided(workspaceId, nextCardId);

    const updatedSubscription = await SubscriptionModel.findOneAndUpdate(
        {
            _id: subscriptionId,
            workspaceId,
        },
        {
            $set: {
                memberId: nextMemberId,
                categoryId: nextCategoryId,
                accountId: nextAccountId,
                cardId: nextCardId,
                name: body.name !== undefined ? body.name.trim() : existingSubscription.name,
                merchant:
                    body.merchant !== undefined
                        ? normalizeNullableString(body.merchant)
                        : existingSubscription.merchant ?? null,
                amount:
                    body.amount !== undefined
                        ? roundMoney(body.amount)
                        : existingSubscription.amount,
                currency: body.currency !== undefined ? body.currency : existingSubscription.currency,
                billingFrequency:
                    body.billingFrequency !== undefined
                        ? body.billingFrequency
                        : existingSubscription.billingFrequency,
                billingDay:
                    body.billingDay !== undefined
                        ? body.billingDay
                        : existingSubscription.billingDay ?? null,
                startDate: nextStartDate,
                nextBillingDate: nextNextBillingDate,
                endDate: nextEndDate,
                status: body.status !== undefined ? body.status : existingSubscription.status,
                autoCreateTransaction:
                    body.autoCreateTransaction !== undefined
                        ? body.autoCreateTransaction
                        : existingSubscription.autoCreateTransaction,
                lastTransactionId:
                    body.lastTransactionId !== undefined
                        ? parseOptionalObjectId(body.lastTransactionId)
                        : existingSubscription.lastTransactionId ?? null,
                notes:
                    body.notes !== undefined
                        ? normalizeNullableString(body.notes)
                        : existingSubscription.notes ?? null,
                isVisible:
                    body.isVisible !== undefined
                        ? body.isVisible
                        : existingSubscription.isVisible,
            },
        },
        { new: true }
    ).lean<SubscriptionDocument | null>();

    return updatedSubscription ? toSubscriptionPayload(updatedSubscription) : null;
}

export async function deleteSubscriptionService(
    input: DeleteSubscriptionServiceInput
): Promise<SubscriptionDocument | null> {
    const { workspaceId, subscriptionId } = input;

    const subscription = await SubscriptionModel.findOneAndDelete({
        _id: subscriptionId,
        workspaceId,
    }).lean<SubscriptionDocument | null>();

    return subscription ? toSubscriptionPayload(subscription) : null;
}

export async function createTransactionFromSubscriptionService(
    input: CreateSubscriptionTransactionServiceInput
): Promise<SubscriptionTransactionResult> {
    const { workspaceId, subscriptionId, body, workspace, createdByUserId } = input;
    const subscription = await findSubscriptionById(workspaceId, subscriptionId);

    if (!subscription) {
        throw new SubscriptionServiceError(
            "Suscripción no encontrada.",
            404,
            "SUBSCRIPTION_NOT_FOUND"
        );
    }

    if (subscription.status !== "active") {
        throw new SubscriptionServiceError(
            "Solo puedes crear transacciones desde suscripciones activas.",
            400,
            "SUBSCRIPTION_NOT_ACTIVE"
        );
    }

    const billingDate = body.transactionDate
        ? parseRequiredDate(body.transactionDate)
        : subscription.nextBillingDate;
    const existingTransaction = await findExistingGeneratedTransaction({
        workspaceId,
        subscriptionId,
        billingDate,
    });

    if (existingTransaction) {
        throw new SubscriptionServiceError(
            "Ya existe una transacción generada para esta suscripción y fecha de cobro.",
            409,
            "SUBSCRIPTION_TRANSACTION_ALREADY_EXISTS"
        );
    }

    const transaction = await createGeneratedTransactionFromSubscription({
        workspaceId,
        workspace,
        subscription,
        billingDate,
        createdByUserId,
        status: body.status,
        reference: body.reference,
        notes: body.notes,
    });
    const updatedSubscription = await advanceSubscriptionAfterTransaction({
        workspaceId,
        subscription,
        billingDate,
        transactionId: transaction._id,
    });

    return {
        subscription: updatedSubscription,
        transaction,
    };
}

export async function processDueSubscriptionsService(
    input: ProcessDueSubscriptionsServiceInput
): Promise<ProcessDueSubscriptionsResult> {
    const { workspaceId, body, workspace } = input;
    const dryRun = body.dryRun ?? true;
    const asOfDate = body.asOfDate ? parseRequiredDate(body.asOfDate) : new Date();
    const limit = body.limit ?? 50;
    const dueSubscriptions = await SubscriptionModel.find({
        workspaceId,
        status: "active",
        isVisible: true,
        autoCreateTransaction: true,
        nextBillingDate: { $lte: asOfDate },
    })
        .sort({ nextBillingDate: 1, createdAt: 1 })
        .limit(limit)
        .lean<SubscriptionDocument[]>();
    const items: ProcessDueSubscriptionItem[] = [];
    let generatedCount = 0;
    let skippedCount = 0;

    for (const subscription of dueSubscriptions) {
        const scheduledBillingDate = subscription.nextBillingDate;
        const nextBillingDate = addBillingFrequency(
            scheduledBillingDate,
            subscription.billingFrequency,
            subscription.billingDay ?? null
        );

        if (subscription.endDate && scheduledBillingDate.getTime() > subscription.endDate.getTime()) {
            items.push({
                subscriptionId: subscription._id,
                subscriptionName: subscription.name,
                scheduledBillingDate,
                nextBillingDate: scheduledBillingDate,
                action: "skipped_end_date",
                reason: "La fecha programada ya rebasa la fecha final de la suscripción.",
                transactionId: null,
            });
            skippedCount += 1;
            continue;
        }

        const existingTransaction = await findExistingGeneratedTransaction({
            workspaceId,
            subscriptionId: subscription._id,
            billingDate: scheduledBillingDate,
        });

        if (existingTransaction) {
            if (!dryRun) {
                await SubscriptionModel.updateOne(
                    {
                        _id: subscription._id,
                        workspaceId,
                    },
                    {
                        $set: {
                            lastTransactionId: existingTransaction._id,
                            nextBillingDate,
                        },
                    }
                );
            }

            items.push({
                subscriptionId: subscription._id,
                subscriptionName: subscription.name,
                scheduledBillingDate,
                nextBillingDate,
                action: "skipped_duplicate",
                reason: "Ya existía una transacción generada con la misma referencia; se evita duplicar.",
                transactionId: existingTransaction._id,
            });
            skippedCount += 1;
            continue;
        }

        if (dryRun) {
            items.push({
                subscriptionId: subscription._id,
                subscriptionName: subscription.name,
                scheduledBillingDate,
                nextBillingDate,
                action: "would_create",
                reason: null,
                transactionId: null,
            });
            continue;
        }

        const createdByUserId = input.createdByUserId ?? subscription.memberId;
        const transaction = await createGeneratedTransactionFromSubscription({
            workspaceId,
            workspace,
            subscription,
            billingDate: scheduledBillingDate,
            createdByUserId,
            status: "posted",
            reference: null,
            notes: null,
        });

        await advanceSubscriptionAfterTransaction({
            workspaceId,
            subscription,
            billingDate: scheduledBillingDate,
            transactionId: transaction._id,
        });

        items.push({
            subscriptionId: subscription._id,
            subscriptionName: subscription.name,
            scheduledBillingDate,
            nextBillingDate,
            action: "created",
            reason: null,
            transactionId: transaction._id,
        });
        generatedCount += 1;
    }

    return {
        dryRun,
        asOfDate,
        scannedCount: dueSubscriptions.length,
        dueCount: dueSubscriptions.length,
        generatedCount,
        skippedCount,
        items,
    };
}