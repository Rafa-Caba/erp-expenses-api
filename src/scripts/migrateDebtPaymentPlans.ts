// src/scripts/migrateDebtPaymentPlans.ts
// One-time migration for Phase 10 debt payment-plan automation.
// Dry-run by default. Use --write to update debts.
//
// What it does:
// - Converts legacy biweekly labels to semimonthly if desired by app convention.
// - Infers expectedPrincipalAmount / expectedFeeAmount from the latest completed payment.
// - Falls back to installmentAmount as principal and fee 0.
// - Optionally enables autoGeneratePayments for debts with enough data using --enableAutoGenerate.
//
// Examples:
// npm run debts:migrate-payment-plans
// npm run debts:migrate-payment-plans -- --workspaceId=<id>
// npm run debts:migrate-payment-plans:write -- --workspaceId=<id>
// npm run debts:migrate-payment-plans:write -- --workspaceId=<id> --enableAutoGenerate

import "dotenv/config";

import { Types } from "mongoose";

import { connectDb, disconnectDb } from "@/src/config/db";
import { DebtModel } from "@/src/debts/models/Debt.model";
import type {
    DebtDocument,
    DebtInstallmentFrequency,
} from "@/src/debts/types/debts.types";
import { PaymentModel } from "@/src/payments/models/Payment.model";
import type { PaymentDocument } from "@/src/payments/types/payments.types";

interface ScriptOptions {
    dryRun: boolean;
    workspaceId: Types.ObjectId | null;
    limit: number;
    enableAutoGenerate: boolean;
    keepBiweekly: boolean;
}

interface MigrationCounters {
    scanned: number;
    wouldUpdate: number;
    updated: number;
    skipped: number;
}

interface MigrationItem {
    debtId: string;
    workspaceId: string;
    description: string;
    action: "would_update" | "updated" | "skipped";
    reason: string | null;
    nextInstallmentFrequency: DebtInstallmentFrequency | null;
    expectedPrincipalAmount: number | null;
    expectedFeeAmount: number | null;
    autoGeneratePayments: boolean;
}

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
    const enableAutoGenerate = argv.includes("--enableAutoGenerate");
    const keepBiweekly = argv.includes("--keepBiweekly");
    const workspaceArg = argv.find((arg) => arg.startsWith("--workspaceId="));
    const limitArg = argv.find((arg) => arg.startsWith("--limit="));
    const rawWorkspaceId = workspaceArg?.replace("--workspaceId=", "").trim() ?? "";
    const rawLimit = limitArg?.replace("--limit=", "").trim() ?? "500";

    if (rawWorkspaceId && !Types.ObjectId.isValid(rawWorkspaceId)) {
        throw new Error("--workspaceId must be a valid Mongo ObjectId.");
    }

    const limit = parseIntegerOption(rawLimit, "--limit");

    if (limit < 1 || limit > 5000) {
        throw new Error("--limit must be between 1 and 5000.");
    }

    return {
        dryRun: !hasWriteFlag,
        workspaceId: rawWorkspaceId ? new Types.ObjectId(rawWorkspaceId) : null,
        limit,
        enableAutoGenerate,
        keepBiweekly,
    };
}

function roundMoney(value: number): number {
    return Number(value.toFixed(2));
}

function createEmptyCounters(): MigrationCounters {
    return {
        scanned: 0,
        wouldUpdate: 0,
        updated: 0,
        skipped: 0,
    };
}

async function getLatestCompletedPaymentForDebt(
    workspaceId: Types.ObjectId,
    debtId: Types.ObjectId
): Promise<PaymentDocument | null> {
    return PaymentModel.findOne({
        workspaceId,
        debtId,
        status: "completed",
    })
        .sort({
            paymentDate: -1,
            createdAt: -1,
        })
        .lean<PaymentDocument | null>();
}

function getNextFrequency(
    debt: DebtDocument,
    keepBiweekly: boolean
): DebtInstallmentFrequency | null {
    const currentFrequency = debt.installmentFrequency ?? null;

    if (currentFrequency === "biweekly" && !keepBiweekly) {
        return "semimonthly";
    }

    return currentFrequency;
}

function inferExpectedBreakdown(args: {
    debt: DebtDocument;
    latestPayment: PaymentDocument | null;
}): {
    expectedPrincipalAmount: number | null;
    expectedFeeAmount: number | null;
} {
    const { debt, latestPayment } = args;

    if (
        debt.expectedPrincipalAmount !== undefined &&
        debt.expectedPrincipalAmount !== null &&
        debt.expectedFeeAmount !== undefined &&
        debt.expectedFeeAmount !== null
    ) {
        return {
            expectedPrincipalAmount: debt.expectedPrincipalAmount,
            expectedFeeAmount: debt.expectedFeeAmount,
        };
    }

    if (latestPayment) {
        return {
            expectedPrincipalAmount: roundMoney(latestPayment.principalAmount),
            expectedFeeAmount: roundMoney(latestPayment.feeAmount),
        };
    }

    if (debt.installmentAmount !== undefined && debt.installmentAmount !== null) {
        return {
            expectedPrincipalAmount: roundMoney(debt.installmentAmount),
            expectedFeeAmount: 0,
        };
    }

    return {
        expectedPrincipalAmount: null,
        expectedFeeAmount: null,
    };
}

function canEnableAutoGenerate(debt: DebtDocument): boolean {
    return Boolean(
        debt.paymentPlanEnabled &&
        debt.relatedAccountId &&
        debt.memberId &&
        debt.installmentAmount &&
        debt.installmentAmount > 0 &&
        debt.installmentFrequency &&
        debt.nextDueDate &&
        debt.remainingAmount > 0 &&
        (debt.status === "active" || debt.status === "overdue")
    );
}

function hasMeaningfulChange(args: {
    debt: DebtDocument;
    nextFrequency: DebtInstallmentFrequency | null;
    expectedPrincipalAmount: number | null;
    expectedFeeAmount: number | null;
    autoGeneratePayments: boolean;
}): boolean {
    const { debt, nextFrequency, expectedPrincipalAmount, expectedFeeAmount, autoGeneratePayments } =
        args;

    return (
        (debt.installmentFrequency ?? null) !== nextFrequency ||
        (debt.expectedPrincipalAmount ?? null) !== expectedPrincipalAmount ||
        (debt.expectedFeeAmount ?? null) !== expectedFeeAmount ||
        (debt.autoGeneratePayments ?? false) !== autoGeneratePayments
    );
}

async function migrateDebt(
    debt: DebtDocument,
    options: ScriptOptions
): Promise<MigrationItem> {
    if (!debt.paymentPlanEnabled) {
        return {
            debtId: debt._id.toString(),
            workspaceId: debt.workspaceId.toString(),
            description: debt.description,
            action: "skipped",
            reason: "La deuda no tiene plan de pagos activo.",
            nextInstallmentFrequency: debt.installmentFrequency ?? null,
            expectedPrincipalAmount: debt.expectedPrincipalAmount ?? null,
            expectedFeeAmount: debt.expectedFeeAmount ?? null,
            autoGeneratePayments: debt.autoGeneratePayments ?? false,
        };
    }

    const latestPayment = await getLatestCompletedPaymentForDebt(
        debt.workspaceId,
        debt._id
    );
    const nextFrequency = getNextFrequency(debt, options.keepBiweekly);
    const breakdown = inferExpectedBreakdown({ debt, latestPayment });
    const autoGeneratePayments =
        options.enableAutoGenerate && canEnableAutoGenerate(debt)
            ? true
            : debt.autoGeneratePayments ?? false;
    const shouldUpdate = hasMeaningfulChange({
        debt,
        nextFrequency,
        expectedPrincipalAmount: breakdown.expectedPrincipalAmount,
        expectedFeeAmount: breakdown.expectedFeeAmount,
        autoGeneratePayments,
    });

    if (!shouldUpdate) {
        return {
            debtId: debt._id.toString(),
            workspaceId: debt.workspaceId.toString(),
            description: debt.description,
            action: "skipped",
            reason: "La deuda ya tiene los campos de plan actualizados.",
            nextInstallmentFrequency: nextFrequency,
            expectedPrincipalAmount: breakdown.expectedPrincipalAmount,
            expectedFeeAmount: breakdown.expectedFeeAmount,
            autoGeneratePayments,
        };
    }

    if (!options.dryRun) {
        await DebtModel.updateOne(
            {
                _id: debt._id,
                workspaceId: debt.workspaceId,
            },
            {
                $set: {
                    installmentFrequency: nextFrequency,
                    expectedPrincipalAmount: breakdown.expectedPrincipalAmount,
                    expectedFeeAmount: breakdown.expectedFeeAmount,
                    autoGeneratePayments,
                },
            }
        );
    }

    return {
        debtId: debt._id.toString(),
        workspaceId: debt.workspaceId.toString(),
        description: debt.description,
        action: options.dryRun ? "would_update" : "updated",
        reason: null,
        nextInstallmentFrequency: nextFrequency,
        expectedPrincipalAmount: breakdown.expectedPrincipalAmount,
        expectedFeeAmount: breakdown.expectedFeeAmount,
        autoGeneratePayments,
    };
}

function updateCounters(counters: MigrationCounters, item: MigrationItem): void {
    counters.scanned += 1;

    if (item.action === "would_update") {
        counters.wouldUpdate += 1;
        return;
    }

    if (item.action === "updated") {
        counters.updated += 1;
        return;
    }

    counters.skipped += 1;
}

function printCounters(counters: MigrationCounters): void {
    console.log("\nSummary");
    console.log(`- Scanned: ${counters.scanned}`);
    console.log(`- Would update: ${counters.wouldUpdate}`);
    console.log(`- Updated: ${counters.updated}`);
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
            `- ${item.action}: ${item.description} | debt ${item.debtId} | workspace ${item.workspaceId} | frequency ${item.nextInstallmentFrequency ?? "null"} | principal ${item.expectedPrincipalAmount ?? "null"} | fee ${item.expectedFeeAmount ?? "null"} | auto ${item.autoGeneratePayments ? "yes" : "no"}${item.reason ? ` | ${item.reason}` : ""}`
        );
    }
}

async function main(): Promise<void> {
    const options = parseOptions(process.argv.slice(2));
    const mongoUri = getMongoUriFromEnv();

    console.log("Debt payment plans migration");
    console.log(`Mode: ${options.dryRun ? "dry-run" : "write"}`);
    console.log(`Workspace: ${options.workspaceId ? options.workspaceId.toString() : "all workspaces"}`);
    console.log(`Limit: ${options.limit}`);
    console.log(`Enable auto generate: ${options.enableAutoGenerate ? "yes" : "no"}`);
    console.log(`Keep biweekly: ${options.keepBiweekly ? "yes" : "no"}`);

    await connectDb(mongoUri);

    try {
        const debts = await DebtModel.find({
            ...(options.workspaceId ? { workspaceId: options.workspaceId } : {}),
            paymentPlanEnabled: true,
        })
            .sort({
                workspaceId: 1,
                startDate: 1,
                createdAt: 1,
            })
            .limit(options.limit)
            .lean<DebtDocument[]>();
        const counters = createEmptyCounters();
        const items: MigrationItem[] = [];

        for (const debt of debts) {
            const item = await migrateDebt(debt, options);
            updateCounters(counters, item);
            items.push(item);
        }

        printCounters(counters);
        printItems(items);

        if (options.dryRun) {
            console.log("\nDry-run only. Run again with --write to apply migration.");
        } else {
            console.log("\nDebt payment plan migration completed.");
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