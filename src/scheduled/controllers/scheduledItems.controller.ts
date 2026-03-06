// src/scheduled/controllers/scheduledItems.controller.ts

import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import {
    CreateScheduledItemSchema,
    ListScheduledItemsQuerySchema,
    UpdateScheduledItemSchema,
} from "@/src/scheduled/schemas/scheduled.schemas";
import {
    createScheduledItem,
    getScheduledItem,
    listScheduledItems,
    restoreScheduledItem,
    softDeleteScheduledItem,
    updateScheduledItem,
} from "@/src/scheduled/services/scheduledItems.service";

function requireUser(req: Request): { id: string } {
    if (!req.user?.id) {
        const e = new Error("Unauthorized");
        (e as { status?: number }).status = 401;
        throw e;
    }
    return { id: req.user.id };
}

function requireWorkspaceAccess(req: Request, workspaceId: string) {
    const wa = req.workspaceAccess;
    if (!wa || wa.workspaceId !== workspaceId) {
        const e = new Error("Workspace access not resolved");
        (e as { status?: number }).status = 500;
        throw e;
    }
    return wa;
}

function requireValidObjectIds(ids: Record<string, string>) {
    for (const [k, v] of Object.entries(ids)) {
        if (!mongoose.isValidObjectId(v)) {
            const e = new Error(`Invalid ${k}`);
            (e as { status?: number }).status = 400;
            throw e;
        }
    }
}

export async function handleCreateScheduledItem(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        requireValidObjectIds({ workspaceId });
        const wa = requireWorkspaceAccess(req, workspaceId);

        const parsed = CreateScheduledItemSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ message: "Invalid body", issues: parsed.error.issues });

        const visibility = parsed.data.visibility ?? "SHARED";
        const ownerUserId = parsed.data.ownerUserId ?? null;
        if (visibility === "PRIVATE" && !ownerUserId) {
            return res.status(400).json({ message: "ownerUserId is required when visibility is PRIVATE" });
        }

        const startDate = new Date(parsed.data.startDate);
        const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
        const { typeMode: _ignore, ...recurrence } = parsed.data.recurrence;

        const doc = await createScheduledItem({
            workspaceId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },

            title: parsed.data.title,
            kind: parsed.data.kind,
            txTypeOnPay: parsed.data.txTypeOnPay,

            amount: parsed.data.amount,
            currency: parsed.data.currency ?? "MXN",

            defaultCategoryId: parsed.data.defaultCategoryId ?? null,
            note: parsed.data.note ?? null,

            startDate,
            recurrence,

            endDate,
            maxOccurrences: parsed.data.maxOccurrences ?? null,

            status: parsed.data.status ?? "ACTIVE",

            visibility,
            ownerUserId,
        });

        return res.status(201).json(doc.toJSON());
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleListScheduledItems(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        requireValidObjectIds({ workspaceId });
        const wa = requireWorkspaceAccess(req, workspaceId);

        const parsed = ListScheduledItemsQuerySchema.safeParse(req.query);
        if (!parsed.success) return res.status(400).json({ message: "Invalid query", issues: parsed.error.issues });

        const data = await listScheduledItems({
            workspaceId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },
            status: parsed.data.status,
            visibility: parsed.data.visibility,
            page: parsed.data.page,
            limit: parsed.data.limit,
        });

        return res.json({ ...data, items: data.items.map((d) => d.toJSON()) });
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleGetScheduledItem(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        const scheduledItemId = String(req.params.scheduledItemId ?? "");
        requireValidObjectIds({ workspaceId, scheduledItemId });
        const wa = requireWorkspaceAccess(req, workspaceId);

        const doc = await getScheduledItem({
            workspaceId,
            scheduledItemId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },
        });

        if (!doc) return res.status(404).json({ message: "ScheduledItem not found" });
        return res.json(doc.toJSON());
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleUpdateScheduledItem(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        const scheduledItemId = String(req.params.scheduledItemId ?? "");
        requireValidObjectIds({ workspaceId, scheduledItemId });
        const wa = requireWorkspaceAccess(req, workspaceId);

        const parsed = UpdateScheduledItemSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ message: "Invalid body", issues: parsed.error.issues });

        const recurrencePatch =
            parsed.data.recurrence ? (({ typeMode: _i, ...r }) => r)(parsed.data.recurrence) : undefined;

        const patch = {
            title: parsed.data.title,
            kind: parsed.data.kind,
            txTypeOnPay: parsed.data.txTypeOnPay,
            amount: parsed.data.amount,
            currency: parsed.data.currency,
            defaultCategoryId: parsed.data.defaultCategoryId ?? undefined,
            note: parsed.data.note ?? undefined,
            startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
            recurrence: recurrencePatch,
            endDate: parsed.data.endDate === undefined ? undefined : (parsed.data.endDate ? new Date(parsed.data.endDate) : null),
            maxOccurrences: parsed.data.maxOccurrences ?? undefined,
            status: parsed.data.status,
            visibility: parsed.data.visibility,
            ownerUserId: parsed.data.ownerUserId ?? undefined,
        };

        const doc = await updateScheduledItem({
            workspaceId,
            scheduledItemId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },
            patch,
        });

        return res.json(doc.toJSON());
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleDeleteScheduledItem(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        const scheduledItemId = String(req.params.scheduledItemId ?? "");
        requireValidObjectIds({ workspaceId, scheduledItemId });
        const wa = requireWorkspaceAccess(req, workspaceId);

        const doc = await softDeleteScheduledItem({
            workspaceId,
            scheduledItemId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },
        });

        return res.json(doc.toJSON());
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleRestoreScheduledItem(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        const scheduledItemId = String(req.params.scheduledItemId ?? "");
        requireValidObjectIds({ workspaceId, scheduledItemId });
        const wa = requireWorkspaceAccess(req, workspaceId);

        const doc = await restoreScheduledItem({
            workspaceId,
            scheduledItemId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },
        });

        return res.json(doc.toJSON());
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}