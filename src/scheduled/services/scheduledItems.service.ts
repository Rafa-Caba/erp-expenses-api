// src/scheduled/services/scheduledItems.service.ts

import mongoose from "mongoose";
import { ScheduledItemModel } from "@/src/scheduled/models/ScheduledItem.model";
import type { ScheduledAccessContext } from "@/src/scheduled/services/scheduled.security";
import {
    assertOwnerRules,
    buildScheduledVisibilityMatchWithRequested,
    canMutateScheduledItem,
} from "@/src/scheduled/services/scheduled.security";
import { computeFirstRunAt } from "@/src/scheduled/utils/recurrence";
import type { Visibility } from "@/src/shared/types/finance";
import type { RecurrenceRule } from "@/src/scheduled/types/scheduled.types";

function toObjectId(id: string, label: string): mongoose.Types.ObjectId {
    if (!mongoose.isValidObjectId(id)) {
        const e = new Error(`Invalid ${label}`);
        (e as { status?: number }).status = 400;
        throw e;
    }
    return new mongoose.Types.ObjectId(id);
}

export async function createScheduledItem(params: {
    workspaceId: string;
    access: ScheduledAccessContext;

    title: string;
    kind: "BILL" | "INCOME";
    txTypeOnPay: "EXPENSE" | "INCOME";

    amount: number;
    currency: "MXN" | "USD";

    defaultCategoryId: string | null;
    note: string | null;

    startDate: Date;
    recurrence: RecurrenceRule;

    endDate: Date | null;
    maxOccurrences: number | null;

    status: "ACTIVE" | "PAUSED" | "CANCELED";

    visibility: Visibility;
    ownerUserId: string | null;
}) {
    assertOwnerRules(params.visibility, params.ownerUserId);

    const nextRunAt = computeFirstRunAt(params.startDate);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const doc = await ScheduledItemModel.create(
            [
                {
                    workspaceId: toObjectId(params.workspaceId, "workspaceId"),
                    title: params.title,
                    kind: params.kind,
                    txTypeOnPay: params.txTypeOnPay,
                    amount: params.amount,
                    currency: params.currency,
                    defaultCategoryId: params.defaultCategoryId ? toObjectId(params.defaultCategoryId, "defaultCategoryId") : null,
                    note: params.note ?? null,
                    startDate: params.startDate,
                    recurrence: params.recurrence,
                    nextRunAt,
                    endDate: params.endDate ?? null,
                    maxOccurrences: params.maxOccurrences ?? null,
                    status: params.status,
                    visibility: params.visibility,
                    ownerUserId: params.ownerUserId ? toObjectId(params.ownerUserId, "ownerUserId") : null,
                    isDeleted: false,
                    deletedAt: null,
                    createdByUserId: toObjectId(params.access.actorUserId, "actorUserId"),
                    updatedByUserId: null,
                },
            ],
            { session }
        );

        await session.commitTransaction();
        return doc[0];
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

export async function listScheduledItems(params: {
    workspaceId: string;
    access: ScheduledAccessContext;
    status?: "ACTIVE" | "PAUSED" | "CANCELED";
    visibility?: Visibility;
    page: number;
    limit: number;
}) {
    const matchVisibility = buildScheduledVisibilityMatchWithRequested({
        actorUserId: params.access.actorUserId,
        requested: params.visibility,
    });

    const match: Record<string, unknown> = {
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: false,
        ...matchVisibility,
    };

    if (params.status) match.status = params.status;

    const page = Math.max(1, params.page);
    const limit = Math.min(100, Math.max(1, params.limit));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
        ScheduledItemModel.find(match).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
        ScheduledItemModel.countDocuments(match),
    ]);

    return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getScheduledItem(params: {
    workspaceId: string;
    scheduledItemId: string;
    access: ScheduledAccessContext;
}) {
    const matchVisibility = buildScheduledVisibilityMatchWithRequested({
        actorUserId: params.access.actorUserId,
    });

    return ScheduledItemModel.findOne({
        _id: toObjectId(params.scheduledItemId, "scheduledItemId"),
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: false,
        ...matchVisibility,
    });
}

export async function updateScheduledItem(params: {
    workspaceId: string;
    scheduledItemId: string;
    access: ScheduledAccessContext;
    patch: Partial<{
        title: string;
        kind: "BILL" | "INCOME";
        txTypeOnPay: "EXPENSE" | "INCOME";
        amount: number;
        currency: "MXN" | "USD";
        defaultCategoryId: string | null;
        note: string | null;
        startDate: Date;
        recurrence: RecurrenceRule;
        endDate: Date | null;
        maxOccurrences: number | null;
        status: "ACTIVE" | "PAUSED" | "CANCELED";
        visibility: Visibility;
        ownerUserId: string | null;
    }>;
}) {
    const doc = await ScheduledItemModel.findOne({
        _id: toObjectId(params.scheduledItemId, "scheduledItemId"),
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: false,
    });

    if (!doc) {
        const e = new Error("ScheduledItem not found");
        (e as { status?: number }).status = 404;
        throw e;
    }

    const createdBy = String(doc.createdByUserId);
    const owner = doc.ownerUserId ? String(doc.ownerUserId) : null;

    if (
        !canMutateScheduledItem({
            access: params.access,
            visibility: doc.visibility,
            ownerUserId: owner,
            createdByUserId: createdBy,
        })
    ) {
        const e = new Error("Forbidden");
        (e as { status?: number }).status = 403;
        throw e;
    }

    const nextVisibility = (params.patch.visibility ?? doc.visibility) as Visibility;
    const nextOwner = params.patch.ownerUserId === undefined ? owner : (params.patch.ownerUserId ?? null);
    assertOwnerRules(nextVisibility, nextOwner);

    if (params.patch.title !== undefined) doc.title = params.patch.title;
    if (params.patch.kind !== undefined) doc.kind = params.patch.kind;
    if (params.patch.txTypeOnPay !== undefined) doc.txTypeOnPay = params.patch.txTypeOnPay;

    if (params.patch.amount !== undefined) doc.amount = params.patch.amount;
    if (params.patch.currency !== undefined) doc.currency = params.patch.currency;

    if (params.patch.defaultCategoryId !== undefined) {
        doc.defaultCategoryId = params.patch.defaultCategoryId
            ? toObjectId(params.patch.defaultCategoryId, "defaultCategoryId")
            : null;
    }

    if (params.patch.note !== undefined) doc.note = params.patch.note ?? null;

    const recChanged = params.patch.recurrence !== undefined;
    const startChanged = params.patch.startDate !== undefined;

    if (params.patch.startDate !== undefined) doc.startDate = params.patch.startDate;
    if (params.patch.recurrence !== undefined) doc.recurrence = params.patch.recurrence;

    // If startDate/recurrence changes, reset nextRunAt from startDate
    if (recChanged || startChanged) {
        doc.nextRunAt = computeFirstRunAt(doc.startDate);
    }

    if (params.patch.endDate !== undefined) doc.endDate = params.patch.endDate ?? null;
    if (params.patch.maxOccurrences !== undefined) doc.maxOccurrences = params.patch.maxOccurrences ?? null;

    if (params.patch.status !== undefined) doc.status = params.patch.status;

    if (params.patch.visibility !== undefined) doc.visibility = params.patch.visibility;
    if (params.patch.ownerUserId !== undefined) {
        doc.ownerUserId = nextOwner ? toObjectId(nextOwner, "ownerUserId") : null;
    }

    doc.updatedByUserId = toObjectId(params.access.actorUserId, "actorUserId");

    await doc.save();
    return doc;
}

export async function softDeleteScheduledItem(params: {
    workspaceId: string;
    scheduledItemId: string;
    access: ScheduledAccessContext;
}) {
    const doc = await ScheduledItemModel.findOne({
        _id: toObjectId(params.scheduledItemId, "scheduledItemId"),
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: false,
    });

    if (!doc) {
        const e = new Error("ScheduledItem not found");
        (e as { status?: number }).status = 404;
        throw e;
    }

    const createdBy = String(doc.createdByUserId);
    const owner = doc.ownerUserId ? String(doc.ownerUserId) : null;

    if (
        !canMutateScheduledItem({
            access: params.access,
            visibility: doc.visibility,
            ownerUserId: owner,
            createdByUserId: createdBy,
        })
    ) {
        const e = new Error("Forbidden");
        (e as { status?: number }).status = 403;
        throw e;
    }

    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.updatedByUserId = toObjectId(params.access.actorUserId, "actorUserId");

    await doc.save();
    return doc;
}

export async function restoreScheduledItem(params: {
    workspaceId: string;
    scheduledItemId: string;
    access: ScheduledAccessContext;
}) {
    const doc = await ScheduledItemModel.findOne({
        _id: toObjectId(params.scheduledItemId, "scheduledItemId"),
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: true,
    });

    if (!doc) {
        const e = new Error("ScheduledItem not found");
        (e as { status?: number }).status = 404;
        throw e;
    }

    const createdBy = String(doc.createdByUserId);
    const owner = doc.ownerUserId ? String(doc.ownerUserId) : null;

    if (
        !canMutateScheduledItem({
            access: params.access,
            visibility: doc.visibility,
            ownerUserId: owner,
            createdByUserId: createdBy,
        })
    ) {
        const e = new Error("Forbidden");
        (e as { status?: number }).status = 403;
        throw e;
    }

    doc.isDeleted = false;
    doc.deletedAt = null;
    doc.updatedByUserId = toObjectId(params.access.actorUserId, "actorUserId");

    await doc.save();
    return doc;
}