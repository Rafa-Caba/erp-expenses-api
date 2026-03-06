// src/scheduled/services/scheduledOccurrences.service.ts

import mongoose from "mongoose";
import { ScheduledOccurrenceModel } from "@/src/scheduled/models/ScheduledOccurrence.model";
import { ScheduledItemModel } from "@/src/scheduled/models/ScheduledItem.model";
import type { ScheduledAccessContext } from "@/src/scheduled/services/scheduled.security";
import { canPayOccurrence, buildScheduledVisibilityMatchWithRequested } from "@/src/scheduled/services/scheduled.security";
import { createTransaction } from "@/src/transactions/services/transactions.service";
import type { Visibility } from "@/src/shared/types/finance";

function toObjectId(id: string, label: string): mongoose.Types.ObjectId {
    if (!mongoose.isValidObjectId(id)) {
        const e = new Error(`Invalid ${label}`);
        (e as { status?: number }).status = 400;
        throw e;
    }
    return new mongoose.Types.ObjectId(id);
}

function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function listUpcomingOccurrences(params: {
    workspaceId: string;
    access: ScheduledAccessContext;
    days: number;
    visibility?: Visibility;
}) {
    const now = new Date();
    const end = new Date(now.getTime());
    end.setDate(end.getDate() + params.days);

    const visibilityMatch = buildScheduledVisibilityMatchWithRequested({
        actorUserId: params.access.actorUserId,
        requested: params.visibility,
    });

    // We must join to ScheduledItem to enforce PRIVATE ownerUserId visibility rules on occurrence.
    // Simple approach: fetch items visible, then occurrences by scheduledItemId.
    const items = await ScheduledItemModel.find({
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: false,
        ...visibilityMatch,
    }).select({ _id: 1 });

    const itemIds = items.map((i) => i._id);

    const occurrences = await ScheduledOccurrenceModel.find({
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        scheduledItemId: { $in: itemIds },
        status: "PENDING",
        runAt: { $lte: end },
    }).sort({ runAt: 1, _id: 1 });

    return occurrences;
}

export async function payOccurrence(params: {
    workspaceId: string;
    access: ScheduledAccessContext;
    occurrenceId: string;

    accountId: string;
    categoryId: string | null;
    note: string | null;
    paidAt: Date;
}) {
    const occ = await ScheduledOccurrenceModel.findOne({
        _id: toObjectId(params.occurrenceId, "occurrenceId"),
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
    });

    if (!occ) {
        const e = new Error("ScheduledOccurrence not found");
        (e as { status?: number }).status = 404;
        throw e;
    }

    if (occ.status !== "PENDING") {
        const e = new Error("Only PENDING occurrences can be paid");
        (e as { status?: number }).status = 409;
        throw e;
    }

    const item = await ScheduledItemModel.findOne({
        _id: occ.scheduledItemId,
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: false,
    });

    if (!item) {
        const e = new Error("ScheduledItem not found for occurrence");
        (e as { status?: number }).status = 404;
        throw e;
    }

    const ownerUserId = item.ownerUserId ? String(item.ownerUserId) : null;

    if (!canPayOccurrence({ access: params.access, visibility: item.visibility, ownerUserId })) {
        const e = new Error("Forbidden");
        (e as { status?: number }).status = 403;
        throw e;
    }

    // Create ledger transaction when "pay/confirm"
    const amount = round2(item.amount);
    const txType = item.txTypeOnPay; // EXPENSE | INCOME
    const delta = txType === "EXPENSE" ? -amount : amount;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const tx = await createTransaction({
            workspaceId: params.workspaceId,
            access: params.access,
            type: txType,
            date: params.paidAt,
            currency: item.currency,
            visibility: item.visibility,
            note: params.note ?? item.note ?? null,
            ownerUserId: item.visibility === "PRIVATE" ? ownerUserId : null,
            lines: [
                {
                    accountId: params.accountId,
                    delta,
                    currency: item.currency,
                    categoryId: params.categoryId ?? item.defaultCategoryId?.toString() ?? null,
                    lineType: "NORMAL",
                    note: params.note ?? null,
                },
            ],
            tags: [],
            attachments: [],
        });

        // Update occurrence
        occ.status = "PAID";
        occ.paidAt = params.paidAt;
        occ.paidByUserId = toObjectId(params.access.actorUserId, "actorUserId");
        occ.transactionId = tx._id;

        occ.accountId = toObjectId(params.accountId, "accountId");
        occ.categoryId = params.categoryId ? toObjectId(params.categoryId, "categoryId") : (item.defaultCategoryId ?? null);
        occ.note = params.note ?? null;

        occ.updatedByUserId = toObjectId(params.access.actorUserId, "actorUserId");

        await occ.save({ session });

        await session.commitTransaction();
        return { occurrence: occ, transaction: tx };
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}