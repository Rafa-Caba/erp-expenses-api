// src/scripts/migrateRecurringTransactionsToSubscriptions.ts
// One-time migration from legacy transaction-level recurrence into the
// subscriptions module.
//
// Scope:
// - Migrates recurring expense transactions into Subscription documents.
// - Uses dry-run by default; writes only with --write.
// - Avoids duplicates by legacyRecurringTransactionId and by a natural match.
// - Disables legacy recurrence on migrated transactions when writing, unless
//   --keepLegacyRecurring is passed.
//
// Examples:
// npm run subscriptions:migrate-recurring-transactions
// npm run subscriptions:migrate-recurring-transactions -- --workspaceId=<id>
// npm run subscriptions:migrate-recurring-transactions:write -- --workspaceId=<id>

import "dotenv/config";

import { Types, type FilterQuery } from "mongoose";

import { CategoryModel } from "@/src/categories/models/Category.model";
import { connectDb, disconnectDb } from "@/src/config/db";
import { SubscriptionModel } from "@/src/subscriptions/models/Subscription.model";
import type {
    SubscriptionBillingFrequency,
    SubscriptionDocument,
} from "@/src/subscriptions/types/subscription.types";
import { TransactionModel } from "@/src/transactions/models/Transaction.model";
import type { TransactionDocument } from "@/src/transactions/types/transaction.types";

interface ScriptOptions {
    dryRun: boolean;
    workspaceId: Types.ObjectId | null;
    asOfDate: Date;
    limit: number;
    keepLegacyRecurring: boolean;
}

interface MigrationCounters {
    scanned: number;
    wouldCreate: number;
    created: number;
    wouldLinkExisting: number;
    linkedExisting: number;
    alreadyLinked: number;
    skipped: number;
    disabledLegacy: number;
    manualReview: number;
}

interface MigrationItem {
    transactionId: string;
    workspaceId: string;
    description: string;
    action:
    | "would_create"
    | "created"
    | "would_link_existing"
    | "linked_existing"
    | "already_linked"
    | "skipped"
    | "manual_review";
    reason: string | null;
    subscriptionId: string | null;
    nextBillingDate: string | null;
}

interface ParsedRecurrenceRule {
    frequency: SubscriptionBillingFrequency;
    billingDay: number | null;
}

type MigratableTransaction = Pick<
    TransactionDocument,
    | "_id"
    | "workspaceId"
    | "accountId"
    | "cardId"
    | "memberId"
    | "categoryId"
    | "type"
    | "amount"
    | "currency"
    | "description"
    | "merchant"
    | "transactionDate"
    | "status"
    | "reference"
    | "notes"
    | "isRecurring"
    | "recurrenceRule"
    | "isActive"
    | "isArchived"
    | "isVisible"
>;

function getMongoUriFromEnv(): string {
    const mongoUri = process.env.MONGO_URI?.trim();

    if (!mongoUri) {
        throw new Error("MONGO_URI is required to run this migration script.");
    }

    return mongoUri;
}

function parseIntegerOption(value: string, label: string): number {
    const numericValue = Number(value);

    if (!Number.isInteger(numericValue)) {
        throw new Error(`${label} must be an integer.`);
    }

    return numericValue;
}

function parseOptions(argv: string[]): ScriptOptions {
    const hasWriteFlag = argv.includes("--write");
    const keepLegacyRecurring = argv.includes("--keepLegacyRecurring");
    const workspaceArg = argv.find((arg) => arg.startsWith("--workspaceId="));
    const asOfDateArg = argv.find((arg) => arg.startsWith("--asOfDate="));
    const limitArg = argv.find((arg) => arg.startsWith("--limit="));

    const rawWorkspaceId = workspaceArg?.replace("--workspaceId=", "").trim() ?? "";
    const rawAsOfDate = asOfDateArg?.replace("--asOfDate=", "").trim() ?? "";
    const rawLimit = limitArg?.replace("--limit=", "").trim() ?? "500";

    if (rawWorkspaceId && !Types.ObjectId.isValid(rawWorkspaceId)) {
        throw new Error("--workspaceId must be a valid Mongo ObjectId.");
    }

    const asOfDate = rawAsOfDate ? new Date(rawAsOfDate) : new Date();

    if (Number.isNaN(asOfDate.getTime())) {
        throw new Error("--asOfDate must be a valid date.");
    }

    const limit = parseIntegerOption(rawLimit, "--limit");

    if (limit < 1 || limit > 5000) {
        throw new Error("--limit must be between 1 and 5000.");
    }

    return {
        dryRun: !hasWriteFlag,
        workspaceId: rawWorkspaceId ? new Types.ObjectId(rawWorkspaceId) : null,
        asOfDate,
        limit,
        keepLegacyRecurring,
    };
}

function createEmptyCounters(): MigrationCounters {
    return {
        scanned: 0,
        wouldCreate: 0,
        created: 0,
        wouldLinkExisting: 0,
        linkedExisting: 0,
        alreadyLinked: 0,
        skipped: 0,
        disabledLegacy: 0,
        manualReview: 0,
    };
}

function normalizeNullableString(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
        return null;
    }

    const normalizedValue = value.trim();

    return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeSubscriptionName(transaction: MigratableTransaction): string {
    const description = transaction.description.trim();

    if (description.toLocaleLowerCase().startsWith("suscripción:")) {
        return description.replace(/^suscripción:\s*/i, "").trim() || description;
    }

    return description;
}

function roundMoney(value: number): number {
    return Number(value.toFixed(2));
}

function parseRecurrenceRule(
    recurrenceRule: string | null | undefined,
    transactionDate: Date
): ParsedRecurrenceRule | null {
    if (!recurrenceRule) {
        return null;
    }

    const parts = recurrenceRule
        .split(";")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
    const entries = new Map<string, string>();

    for (const part of parts) {
        const [rawKey, rawValue] = part.split("=");

        if (!rawKey || !rawValue) {
            continue;
        }

        entries.set(rawKey.trim().toUpperCase(), rawValue.trim().toUpperCase());
    }

    const freq = entries.get("FREQ");
    const interval = Number(entries.get("INTERVAL") ?? "1");

    if (!Number.isInteger(interval) || interval <= 0) {
        return null;
    }

    if (freq === "WEEKLY" && interval === 1) {
        return {
            frequency: "weekly",
            billingDay: null,
        };
    }

    if (freq === "WEEKLY" && interval === 2) {
        return {
            frequency: "biweekly",
            billingDay: null,
        };
    }

    if (freq === "MONTHLY" && interval === 1) {
        return {
            frequency: "monthly",
            billingDay: transactionDate.getDate(),
        };
    }

    if (freq === "YEARLY" && interval === 1) {
        return {
            frequency: "yearly",
            billingDay: transactionDate.getDate(),
        };
    }

    return null;
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

function startOfDay(value: Date): Date {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);

    return date;
}

function getNextBillingDate(args: {
    transactionDate: Date;
    frequency: SubscriptionBillingFrequency;
    billingDay: number | null;
    asOfDate: Date;
}): Date {
    const asOfStart = startOfDay(args.asOfDate);
    let candidate = addBillingFrequency(
        args.transactionDate,
        args.frequency,
        args.billingDay
    );

    while (candidate.getTime() < asOfStart.getTime()) {
        candidate = addBillingFrequency(candidate, args.frequency, args.billingDay);
    }

    return candidate;
}

function buildRecurringTransactionFilter(
    workspaceId: Types.ObjectId | null
): FilterQuery<TransactionDocument> {
    const filter: FilterQuery<TransactionDocument> = {
        isRecurring: true,
        isActive: true,
        isArchived: { $ne: true },
    };

    if (workspaceId) {
        filter.workspaceId = workspaceId;
    }

    return filter;
}

async function categoryCanBeSubscriptionExpense(
    workspaceId: Types.ObjectId,
    categoryId: Types.ObjectId | null | undefined
): Promise<boolean> {
    if (!categoryId) {
        return false;
    }

    const category = await CategoryModel.exists({
        _id: categoryId,
        workspaceId,
        type: { $in: ["EXPENSE", "BOTH"] },
        isActive: true,
    });

    return Boolean(category);
}

async function findExistingSubscriptionByLegacyTransaction(
    transactionId: Types.ObjectId
): Promise<SubscriptionDocument | null> {
    return SubscriptionModel.findOne({
        legacyRecurringTransactionId: transactionId,
    }).lean<SubscriptionDocument | null>();
}

async function findExistingSubscriptionByNaturalKey(
    transaction: MigratableTransaction,
    subscriptionName: string
): Promise<SubscriptionDocument | null> {
    const merchant = normalizeNullableString(transaction.merchant);

    return SubscriptionModel.findOne({
        workspaceId: transaction.workspaceId,
        name: subscriptionName,
        merchant,
        amount: roundMoney(transaction.amount),
        currency: transaction.currency,
        categoryId: transaction.categoryId ?? null,
        accountId: transaction.accountId ?? null,
        cardId: transaction.cardId ?? null,
        status: { $in: ["active", "paused"] },
    }).lean<SubscriptionDocument | null>();
}

function buildMigrationNotes(transaction: MigratableTransaction): string {
    const notes = normalizeNullableString(transaction.notes);
    const sourceText = `Migrada desde transacción recurrente ${transaction._id.toString()}.`;

    return notes ? `${notes}\n\n${sourceText}` : sourceText;
}

async function disableLegacyRecurring(transaction: MigratableTransaction): Promise<void> {
    await TransactionModel.updateOne(
        { _id: transaction._id },
        {
            $set: {
                isRecurring: false,
                recurrenceRule: null,
            },
        }
    );
}

function buildManualReviewItem(
    transaction: MigratableTransaction,
    reason: string
): MigrationItem {
    return {
        transactionId: transaction._id.toString(),
        workspaceId: transaction.workspaceId.toString(),
        description: transaction.description,
        action: "manual_review",
        reason,
        subscriptionId: null,
        nextBillingDate: null,
    };
}

async function migrateTransaction(args: {
    transaction: MigratableTransaction;
    options: ScriptOptions;
}): Promise<MigrationItem> {
    const { transaction, options } = args;

    if (transaction.type !== "expense") {
        return buildManualReviewItem(
            transaction,
            "Solo las transacciones recurrentes de tipo expense se migran a suscripciones."
        );
    }

    if (!transaction.categoryId) {
        return buildManualReviewItem(
            transaction,
            "La transacción no tiene categoryId."
        );
    }

    if (!transaction.accountId && !transaction.cardId) {
        return buildManualReviewItem(
            transaction,
            "La transacción no tiene accountId ni cardId."
        );
    }

    if (transaction.accountId && transaction.cardId) {
        return buildManualReviewItem(
            transaction,
            "La transacción tiene accountId y cardId; la suscripción requiere una sola fuente."
        );
    }

    const categoryIsValid = await categoryCanBeSubscriptionExpense(
        transaction.workspaceId,
        transaction.categoryId
    );

    if (!categoryIsValid) {
        return buildManualReviewItem(
            transaction,
            "La categoría no existe, no está activa o no es de tipo gasto/ambos."
        );
    }

    const recurrence = parseRecurrenceRule(
        transaction.recurrenceRule,
        transaction.transactionDate
    );

    if (!recurrence) {
        return buildManualReviewItem(
            transaction,
            `La regla de recurrencia no es compatible: ${transaction.recurrenceRule ?? "sin regla"}.`
        );
    }

    const existingByLegacy = await findExistingSubscriptionByLegacyTransaction(
        transaction._id
    );

    if (existingByLegacy) {
        if (!options.dryRun && !options.keepLegacyRecurring) {
            await disableLegacyRecurring(transaction);
        }

        return {
            transactionId: transaction._id.toString(),
            workspaceId: transaction.workspaceId.toString(),
            description: transaction.description,
            action: "already_linked",
            reason: "Ya existía una suscripción ligada a esta transacción recurrente.",
            subscriptionId: existingByLegacy._id.toString(),
            nextBillingDate: existingByLegacy.nextBillingDate.toISOString(),
        };
    }

    const subscriptionName = normalizeSubscriptionName(transaction);
    const existingByNaturalKey = await findExistingSubscriptionByNaturalKey(
        transaction,
        subscriptionName
    );
    const nextBillingDate = getNextBillingDate({
        transactionDate: transaction.transactionDate,
        frequency: recurrence.frequency,
        billingDay: recurrence.billingDay,
        asOfDate: options.asOfDate,
    });

    if (existingByNaturalKey) {
        if (!options.dryRun) {
            await SubscriptionModel.updateOne(
                { _id: existingByNaturalKey._id },
                {
                    $set: {
                        legacyRecurringTransactionId: transaction._id,
                        migrationSource: "recurring_transaction",
                    },
                }
            );

            if (!options.keepLegacyRecurring) {
                await disableLegacyRecurring(transaction);
            }
        }

        return {
            transactionId: transaction._id.toString(),
            workspaceId: transaction.workspaceId.toString(),
            description: transaction.description,
            action: options.dryRun ? "would_link_existing" : "linked_existing",
            reason: "Se encontró una suscripción existente con los mismos datos principales.",
            subscriptionId: existingByNaturalKey._id.toString(),
            nextBillingDate: existingByNaturalKey.nextBillingDate.toISOString(),
        };
    }

    if (options.dryRun) {
        return {
            transactionId: transaction._id.toString(),
            workspaceId: transaction.workspaceId.toString(),
            description: transaction.description,
            action: "would_create",
            reason: null,
            subscriptionId: null,
            nextBillingDate: nextBillingDate.toISOString(),
        };
    }

    const subscription = await SubscriptionModel.create({
        workspaceId: transaction.workspaceId,
        memberId: transaction.memberId,
        categoryId: transaction.categoryId,
        accountId: transaction.accountId ?? null,
        cardId: transaction.cardId ?? null,
        name: subscriptionName,
        merchant: normalizeNullableString(transaction.merchant),
        amount: roundMoney(transaction.amount),
        currency: transaction.currency,
        billingFrequency: recurrence.frequency,
        billingDay: recurrence.billingDay,
        startDate: transaction.transactionDate,
        nextBillingDate,
        endDate: null,
        status: "active",
        autoCreateTransaction: true,
        lastTransactionId: transaction._id,
        legacyRecurringTransactionId: transaction._id,
        migrationSource: "recurring_transaction",
        notes: buildMigrationNotes(transaction),
        isVisible: transaction.isVisible ?? true,
    });

    if (!options.keepLegacyRecurring) {
        await disableLegacyRecurring(transaction);
    }

    return {
        transactionId: transaction._id.toString(),
        workspaceId: transaction.workspaceId.toString(),
        description: transaction.description,
        action: "created",
        reason: null,
        subscriptionId: subscription._id.toString(),
        nextBillingDate: subscription.nextBillingDate.toISOString(),
    };
}

function updateCountersFromItem(
    counters: MigrationCounters,
    item: MigrationItem,
    options: ScriptOptions
): void {
    counters.scanned += 1;

    if (item.action === "would_create") {
        counters.wouldCreate += 1;
        return;
    }

    if (item.action === "created") {
        counters.created += 1;
        if (!options.keepLegacyRecurring) {
            counters.disabledLegacy += 1;
        }
        return;
    }

    if (item.action === "would_link_existing") {
        counters.wouldLinkExisting += 1;
        return;
    }

    if (item.action === "linked_existing") {
        counters.linkedExisting += 1;
        if (!options.keepLegacyRecurring) {
            counters.disabledLegacy += 1;
        }
        return;
    }

    if (item.action === "already_linked") {
        counters.alreadyLinked += 1;
        if (!options.dryRun && !options.keepLegacyRecurring) {
            counters.disabledLegacy += 1;
        }
        return;
    }

    if (item.action === "manual_review") {
        counters.manualReview += 1;
        return;
    }

    counters.skipped += 1;
}

function printCounters(counters: MigrationCounters): void {
    console.log("\nSummary");
    console.log(`- Scanned: ${counters.scanned}`);
    console.log(`- Would create: ${counters.wouldCreate}`);
    console.log(`- Created: ${counters.created}`);
    console.log(`- Would link existing: ${counters.wouldLinkExisting}`);
    console.log(`- Linked existing: ${counters.linkedExisting}`);
    console.log(`- Already linked: ${counters.alreadyLinked}`);
    console.log(`- Disabled legacy recurrence: ${counters.disabledLegacy}`);
    console.log(`- Manual review: ${counters.manualReview}`);
    console.log(`- Skipped: ${counters.skipped}`);
}

function printItems(items: MigrationItem[]): void {
    if (items.length === 0) {
        console.log("\nItems: none");
        return;
    }

    console.log("\nItems");

    for (const item of items) {
        console.log(
            `- ${item.action}: ${item.description} | transaction ${item.transactionId} | workspace ${item.workspaceId}${item.subscriptionId ? ` | subscription ${item.subscriptionId}` : ""}${item.nextBillingDate ? ` | next ${item.nextBillingDate.slice(0, 10)}` : ""}${item.reason ? ` | ${item.reason}` : ""}`
        );
    }
}

async function main(): Promise<void> {
    const options = parseOptions(process.argv.slice(2));
    const mongoUri = getMongoUriFromEnv();

    console.log("Recurring transactions to subscriptions migration");
    console.log(`Mode: ${options.dryRun ? "dry-run" : "write"}`);
    console.log(`Workspace: ${options.workspaceId ? options.workspaceId.toString() : "all workspaces"}`);
    console.log(`As of: ${options.asOfDate.toISOString().slice(0, 10)}`);
    console.log(`Limit: ${options.limit}`);
    console.log(`Keep legacy recurrence: ${options.keepLegacyRecurring ? "yes" : "no"}`);

    await connectDb(mongoUri);

    try {
        const transactions = await TransactionModel.find(
            buildRecurringTransactionFilter(options.workspaceId)
        )
            .sort({ workspaceId: 1, transactionDate: 1, createdAt: 1 })
            .limit(options.limit)
            .lean<MigratableTransaction[]>();
        const counters = createEmptyCounters();
        const items: MigrationItem[] = [];

        for (const transaction of transactions) {
            const item = await migrateTransaction({ transaction, options });
            updateCountersFromItem(counters, item, options);
            items.push(item);
        }

        printCounters(counters);
        printItems(items);

        if (options.dryRun) {
            console.log("\nDry-run only. Run again with --write to apply migration.");
        } else {
            console.log("\nMigration completed.");
        }
    } finally {
        await disconnectDb();
    }
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown migration error.";

    console.error("\nMigration failed:");
    console.error(message);
    process.exitCode = 1;
});