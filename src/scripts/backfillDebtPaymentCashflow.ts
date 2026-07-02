// src/scripts/backfillDebtPaymentCashflow.ts
// One-time backfill for debt payment cashflow fields introduced in the debt
// cashflow phases.
//
// What it fixes:
// - Old Payment documents get principalAmount, feeAmount, and cashflowDirection.
// - Old debt_payment Transaction documents get debtId and cashflowDirection.
//
// Safety:
// - Dry-run by default. Nothing is written unless --write is passed.
// - Use --workspaceId=<ObjectId> to limit the backfill to one workspace.
// - Rows that cannot be fully resolved are logged as manual review items.

import "dotenv/config";

import { Types, type FilterQuery } from "mongoose";

import { connectDb, disconnectDb } from "@/src/config/db";
import { DebtModel } from "@/src/debts/models/Debt.model";
import type { DebtDocument, DebtType } from "@/src/debts/types/debts.types";
import { PaymentModel } from "@/src/payments/models/Payment.model";
import type { PaymentDocument } from "@/src/payments/types/payments.types";
import type { CashflowDirection } from "@/src/shared/types/common";
import { TransactionModel } from "@/src/transactions/models/Transaction.model";
import type { TransactionDocument } from "@/src/transactions/types/transaction.types";

type ScriptOptions = {
    dryRun: boolean;
    workspaceId: Types.ObjectId | null;
};

type BackfillCounters = {
    scanned: number;
    updated: number;
    unchanged: number;
    manualReview: number;
};

type BackfillResult = {
    payments: BackfillCounters;
    transactions: BackfillCounters;
};

type LegacyPaymentRecord = {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    debtId?: Types.ObjectId | null;
    transactionId?: Types.ObjectId | null;
    amount: number;
    principalAmount?: number | null;
    feeAmount?: number | null;
    cashflowDirection?: CashflowDirection | null;
};

type LegacyDebtPaymentTransactionRecord = {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    type: "debt_payment";
    debtId?: Types.ObjectId | null;
    cashflowDirection?: CashflowDirection | null;
};

type PaymentUpdateSet = {
    principalAmount?: number;
    feeAmount?: number;
    cashflowDirection?: CashflowDirection;
};

type TransactionUpdateSet = {
    debtId?: Types.ObjectId | null;
    cashflowDirection?: CashflowDirection;
};

type ManualReviewItem = {
    collection: "payments" | "transactions";
    documentId: string;
    workspaceId: string;
    reason: string;
};

const manualReviewItems: ManualReviewItem[] = [];

function createEmptyCounters(): BackfillCounters {
    return {
        scanned: 0,
        updated: 0,
        unchanged: 0,
        manualReview: 0,
    };
}

function getMongoUriFromEnv(): string {
    const mongoUri = process.env.MONGO_URI?.trim();

    if (!mongoUri) {
        throw new Error("MONGO_URI is required to run this backfill script.");
    }

    return mongoUri;
}

function parseOptions(argv: string[]): ScriptOptions {
    const hasWriteFlag = argv.includes("--write");
    const workspaceArg = argv.find((arg) => arg.startsWith("--workspaceId="));
    const rawWorkspaceId = workspaceArg?.replace("--workspaceId=", "").trim() ?? "";

    if (rawWorkspaceId.length > 0 && !Types.ObjectId.isValid(rawWorkspaceId)) {
        throw new Error("--workspaceId must be a valid Mongo ObjectId.");
    }

    return {
        dryRun: !hasWriteFlag,
        workspaceId: rawWorkspaceId.length > 0 ? new Types.ObjectId(rawWorkspaceId) : null,
    };
}

function resolveCashflowDirectionFromDebtType(debtType: DebtType): CashflowDirection {
    return debtType === "owed_to_me" ? "in" : "out";
}

function isMissingNumber(value: number | null | undefined): boolean {
    return value === undefined || value === null || !Number.isFinite(value);
}

function isMissingCashflowDirection(value: CashflowDirection | null | undefined): boolean {
    return value !== "in" && value !== "out";
}

function objectIdEquals(left: Types.ObjectId | null | undefined, right: Types.ObjectId): boolean {
    return Boolean(left?.equals(right));
}

function addManualReviewItem(item: ManualReviewItem): void {
    manualReviewItems.push(item);
}

async function findDebtById(
    debtId: Types.ObjectId | null | undefined
): Promise<DebtDocument | null> {
    if (!debtId) {
        return null;
    }

    return DebtModel.findById(debtId).lean<DebtDocument | null>();
}

async function findPaymentByTransactionId(
    transactionId: Types.ObjectId
): Promise<LegacyPaymentRecord | null> {
    return PaymentModel.findOne({
        transactionId,
    })
        .sort({ createdAt: 1 })
        .lean<LegacyPaymentRecord | null>();
}

function buildPaymentBackfillFilter(
    workspaceId: Types.ObjectId | null
): FilterQuery<PaymentDocument> {
    const filter: FilterQuery<PaymentDocument> = {
        $or: [
            { principalAmount: { $exists: false } },
            { principalAmount: null },
            { feeAmount: { $exists: false } },
            { feeAmount: null },
            { cashflowDirection: { $exists: false } },
            { cashflowDirection: null },
        ],
    };

    if (workspaceId) {
        filter.workspaceId = workspaceId;
    }

    return filter;
}

function buildDebtPaymentTransactionBackfillFilter(
    workspaceId: Types.ObjectId | null
): FilterQuery<TransactionDocument> {
    const filter: FilterQuery<TransactionDocument> = {
        type: "debt_payment",
        $or: [
            { cashflowDirection: { $exists: false } },
            { cashflowDirection: null },
            { debtId: { $exists: false } },
            { debtId: null },
        ],
    };

    if (workspaceId) {
        filter.workspaceId = workspaceId;
    }

    return filter;
}

async function backfillPayments(options: ScriptOptions): Promise<BackfillCounters> {
    const counters = createEmptyCounters();
    const payments = await PaymentModel.find(buildPaymentBackfillFilter(options.workspaceId))
        .sort({ createdAt: 1 })
        .lean<LegacyPaymentRecord[]>();

    counters.scanned = payments.length;

    for (const payment of payments) {
        const updateSet: PaymentUpdateSet = {};
        const debt = await findDebtById(payment.debtId);

        if (isMissingNumber(payment.principalAmount)) {
            updateSet.principalAmount = payment.amount;
        }

        if (isMissingNumber(payment.feeAmount)) {
            updateSet.feeAmount = 0;
        }

        if (isMissingCashflowDirection(payment.cashflowDirection)) {
            if (debt) {
                updateSet.cashflowDirection = resolveCashflowDirectionFromDebtType(debt.type);
            } else {
                updateSet.cashflowDirection = "out";
                counters.manualReview += 1;

                addManualReviewItem({
                    collection: "payments",
                    documentId: payment._id.toString(),
                    workspaceId: payment.workspaceId.toString(),
                    reason: "Payment has no resolvable debt. cashflowDirection defaults to out for compatibility.",
                });
            }
        }

        if (Object.keys(updateSet).length === 0) {
            counters.unchanged += 1;
            continue;
        }

        if (!options.dryRun) {
            await PaymentModel.updateOne(
                { _id: payment._id },
                {
                    $set: updateSet,
                }
            );
        }

        counters.updated += 1;
    }

    return counters;
}

async function buildTransactionUpdateFromPayment(
    transaction: LegacyDebtPaymentTransactionRecord,
    payment: LegacyPaymentRecord
): Promise<TransactionUpdateSet> {
    const debt = await findDebtById(payment.debtId);

    if (!debt) {
        addManualReviewItem({
            collection: "transactions",
            documentId: transaction._id.toString(),
            workspaceId: transaction.workspaceId.toString(),
            reason: "Linked payment exists, but its debt could not be resolved. cashflowDirection defaults to out.",
        });

        return {
            debtId: payment.debtId ?? transaction.debtId ?? null,
            cashflowDirection: "out",
        };
    }

    return {
        debtId: payment.debtId ?? transaction.debtId ?? null,
        cashflowDirection: resolveCashflowDirectionFromDebtType(debt.type),
    };
}

async function buildTransactionUpdateWithoutPayment(
    transaction: LegacyDebtPaymentTransactionRecord
): Promise<TransactionUpdateSet> {
    const debt = await findDebtById(transaction.debtId);

    if (debt) {
        return {
            debtId: transaction.debtId ?? null,
            cashflowDirection: resolveCashflowDirectionFromDebtType(debt.type),
        };
    }

    addManualReviewItem({
        collection: "transactions",
        documentId: transaction._id.toString(),
        workspaceId: transaction.workspaceId.toString(),
        reason: "No linked payment and no resolvable debt. cashflowDirection defaults to out; debtId remains unchanged/null.",
    });

    return {
        debtId: transaction.debtId ?? null,
        cashflowDirection: "out",
    };
}

function hasTransactionChanges(
    transaction: LegacyDebtPaymentTransactionRecord,
    updateSet: TransactionUpdateSet
): boolean {
    const nextDebtId = updateSet.debtId ?? null;
    const currentDebtId = transaction.debtId ?? null;
    const debtChanged = nextDebtId
        ? !objectIdEquals(currentDebtId, nextDebtId)
        : currentDebtId !== null;
    const directionChanged = transaction.cashflowDirection !== updateSet.cashflowDirection;

    return debtChanged || directionChanged;
}

async function backfillDebtPaymentTransactions(
    options: ScriptOptions
): Promise<BackfillCounters> {
    const counters = createEmptyCounters();
    const transactions = await TransactionModel.find(
        buildDebtPaymentTransactionBackfillFilter(options.workspaceId)
    )
        .sort({ createdAt: 1 })
        .lean<LegacyDebtPaymentTransactionRecord[]>();

    counters.scanned = transactions.length;

    for (const transaction of transactions) {
        const manualReviewCountBeforeTransaction = manualReviewItems.length;
        const payment = await findPaymentByTransactionId(transaction._id);
        const updateSet = payment
            ? await buildTransactionUpdateFromPayment(transaction, payment)
            : await buildTransactionUpdateWithoutPayment(transaction);

        if (manualReviewItems.length > manualReviewCountBeforeTransaction) {
            counters.manualReview +=
                manualReviewItems.length - manualReviewCountBeforeTransaction;
        }

        if (!hasTransactionChanges(transaction, updateSet)) {
            counters.unchanged += 1;
            continue;
        }

        if (!options.dryRun) {
            await TransactionModel.updateOne(
                { _id: transaction._id },
                {
                    $set: updateSet,
                }
            );
        }

        counters.updated += 1;
    }

    return counters;
}

function printCounters(label: string, counters: BackfillCounters): void {
    console.log(`\n${label}`);
    console.log(`- Scanned: ${counters.scanned}`);
    console.log(`- Updated: ${counters.updated}`);
    console.log(`- Unchanged: ${counters.unchanged}`);
    console.log(`- Manual review: ${counters.manualReview}`);
}

function printManualReviewItems(): void {
    if (manualReviewItems.length === 0) {
        console.log("\nManual review: none");
        return;
    }

    console.log("\nManual review items:");

    for (const item of manualReviewItems) {
        console.log(
            `- ${item.collection} ${item.documentId} | workspace ${item.workspaceId} | ${item.reason}`
        );
    }
}

async function runBackfill(options: ScriptOptions): Promise<BackfillResult> {
    const payments = await backfillPayments(options);
    const transactions = await backfillDebtPaymentTransactions(options);

    return {
        payments,
        transactions,
    };
}

async function main(): Promise<void> {
    const options = parseOptions(process.argv.slice(2));
    const mongoUri = getMongoUriFromEnv();

    console.log("Debt payment cashflow backfill");
    console.log(`Mode: ${options.dryRun ? "dry-run" : "write"}`);
    console.log(
        `Workspace: ${options.workspaceId ? options.workspaceId.toString() : "all workspaces"}`
    );

    await connectDb(mongoUri);

    try {
        const result = await runBackfill(options);

        printCounters("Payments", result.payments);
        printCounters("Debt payment transactions", result.transactions);
        printManualReviewItems();

        if (options.dryRun) {
            console.log("\nDry-run only. Run again with --write to apply these updates.");
        } else {
            console.log("\nBackfill completed and written to the database.");
        }
    } finally {
        await disconnectDb();
    }
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown backfill error.";

    console.error("\nBackfill failed:");
    console.error(message);
    process.exitCode = 1;
});