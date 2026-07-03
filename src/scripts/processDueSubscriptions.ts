// src/scripts/processDueSubscriptions.ts
// CLI runner for Phase 9B recurring subscription engine.
// Dry-run by default. Use --write to create due transactions and advance
// subscription.nextBillingDate.
// Examples:
//   npm run subscriptions:process-due
//   npm run subscriptions:process-due -- --workspaceId=... --asOfDate=2026-07-02
//   npm run subscriptions:process-due:write -- --workspaceId=...

import "dotenv/config";

import { Types } from "mongoose";

import { connectDb, disconnectDb } from "@/src/config/db";
import { processDueSubscriptionsService } from "@/src/subscriptions/services/subscriptions.service";
import type { ProcessDueSubscriptionsResult } from "@/src/subscriptions/types/subscription.types";
import { WorkspaceModel } from "@/src/workspaces/models/Workspace.model";

interface ScriptOptions {
    dryRun: boolean;
    workspaceId: Types.ObjectId | null;
    asOfDate: string | null;
    limit: number;
}

function getMongoUriFromEnv(): string {
    const mongoUri = process.env.MONGO_URI?.trim();

    if (!mongoUri) {
        throw new Error("MONGO_URI is required to run this script.");
    }

    return mongoUri;
}

function parseNumberOption(value: string, label: string): number {
    const numericValue = Number(value);

    if (!Number.isInteger(numericValue)) {
        throw new Error(`${label} must be an integer.`);
    }

    return numericValue;
}

function parseOptions(argv: string[]): ScriptOptions {
    const hasWriteFlag = argv.includes("--write");
    const workspaceArg = argv.find((arg) => arg.startsWith("--workspaceId="));
    const asOfDateArg = argv.find((arg) => arg.startsWith("--asOfDate="));
    const limitArg = argv.find((arg) => arg.startsWith("--limit="));
    const rawWorkspaceId = workspaceArg?.replace("--workspaceId=", "").trim() ?? "";
    const rawAsOfDate = asOfDateArg?.replace("--asOfDate=", "").trim() ?? "";
    const rawLimit = limitArg?.replace("--limit=", "").trim() ?? "50";

    if (rawWorkspaceId.length > 0 && !Types.ObjectId.isValid(rawWorkspaceId)) {
        throw new Error("--workspaceId must be a valid Mongo ObjectId.");
    }

    const limit = parseNumberOption(rawLimit, "--limit");

    if (limit < 1 || limit > 100) {
        throw new Error("--limit must be between 1 and 100.");
    }

    if (rawAsOfDate.length > 0 && Number.isNaN(new Date(rawAsOfDate).getTime())) {
        throw new Error("--asOfDate must be a valid date.");
    }

    return {
        dryRun: !hasWriteFlag,
        workspaceId: rawWorkspaceId.length > 0 ? new Types.ObjectId(rawWorkspaceId) : null,
        asOfDate: rawAsOfDate.length > 0 ? rawAsOfDate : null,
        limit,
    };
}

function printWorkspaceResult(workspaceName: string, result: ProcessDueSubscriptionsResult): void {
    console.log(`\nWorkspace: ${workspaceName}`);
    console.log(`- Mode: ${result.dryRun ? "dry-run" : "write"}`);
    console.log(`- As of: ${result.asOfDate.toISOString()}`);
    console.log(`- Due: ${result.dueCount}`);
    console.log(`- Generated: ${result.generatedCount}`);
    console.log(`- Skipped: ${result.skippedCount}`);

    if (result.items.length === 0) {
        console.log("- Items: none");
        return;
    }

    for (const item of result.items) {
        console.log(
            `- ${item.action}: ${item.subscriptionName} | scheduled ${item.scheduledBillingDate.toISOString().slice(0, 10)} | next ${item.nextBillingDate.toISOString().slice(0, 10)}${item.transactionId ? ` | transaction ${item.transactionId.toString()}` : ""}${item.reason ? ` | ${item.reason}` : ""}`
        );
    }
}

async function main(): Promise<void> {
    const options = parseOptions(process.argv.slice(2));
    const mongoUri = getMongoUriFromEnv();

    console.log("Due subscriptions processor");
    console.log(`Mode: ${options.dryRun ? "dry-run" : "write"}`);
    console.log(`Workspace: ${options.workspaceId ? options.workspaceId.toString() : "all active workspaces"}`);
    console.log(`As of: ${options.asOfDate ?? "now"}`);
    console.log(`Limit per workspace: ${options.limit}`);

    await connectDb(mongoUri);

    try {
        const workspaces = await WorkspaceModel.find({
            ...(options.workspaceId ? { _id: options.workspaceId } : {}),
            isActive: true,
            isArchived: { $ne: true },
        }).lean();

        if (workspaces.length === 0) {
            console.log("\nNo active workspaces matched the requested filters.");
            return;
        }

        for (const workspace of workspaces) {
            const result = await processDueSubscriptionsService({
                workspaceId: workspace._id,
                workspace,
                createdByUserId: null,
                body: {
                    dryRun: options.dryRun,
                    asOfDate: options.asOfDate ?? undefined,
                    limit: options.limit,
                },
            });

            printWorkspaceResult(workspace.name, result);
        }

        if (options.dryRun) {
            console.log("\nDry-run only. Run with --write to generate transactions.");
        } else {
            console.log("\nDue subscription processing completed.");
        }
    } finally {
        await disconnectDb();
    }
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown due subscription error.";

    console.error("\nDue subscription processing failed:");
    console.error(message);
    process.exitCode = 1;
});