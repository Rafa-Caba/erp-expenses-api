// src/debts/controllers/debts.controller.ts

import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import { CreateDebtSchema, ListDebtsQuerySchema, UpdateDebtSchema } from "@/src/debts/schemas/debt.schemas";
import {
    createDebt,
    getDebt,
    listDebts,
    restoreDebt,
    softDeleteDebt,
    updateDebt,
} from "@/src/debts/services/debts.service";

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

export async function handleCreateDebt(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        requireValidObjectIds({ workspaceId });

        const wa = requireWorkspaceAccess(req, workspaceId);

        const parsed = CreateDebtSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ message: "Invalid body", issues: parsed.error.issues });

        const visibility = parsed.data.visibility ?? "SHARED";
        const ownerUserId = parsed.data.ownerUserId ?? null;

        // enforce your rule in controller too (nice error)
        if (visibility === "PRIVATE" && !ownerUserId) {
            return res.status(400).json({ message: "ownerUserId is required when visibility is PRIVATE" });
        }

        const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;

        const debt = await createDebt({
            workspaceId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },

            kind: parsed.data.kind,
            principal: parsed.data.principal,
            remaining: parsed.data.remaining,

            counterparty: parsed.data.counterparty,
            dueDate,

            currency: parsed.data.currency ?? "MXN",
            visibility,
            ownerUserId,

            status: parsed.data.status ?? "ACTIVE",
            note: parsed.data.note ?? null,
        });

        return res.status(201).json(debt.toJSON());
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleGetDebt(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        const debtId = String(req.params.debtId ?? "");
        requireValidObjectIds({ workspaceId, debtId });

        const wa = requireWorkspaceAccess(req, workspaceId);

        const debt = await getDebt({
            workspaceId,
            debtId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },
        });

        if (!debt) return res.status(404).json({ message: "Debt not found" });
        return res.json(debt.toJSON());
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleListDebts(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        requireValidObjectIds({ workspaceId });

        const wa = requireWorkspaceAccess(req, workspaceId);

        const parsed = ListDebtsQuerySchema.safeParse(req.query);
        if (!parsed.success) return res.status(400).json({ message: "Invalid query", issues: parsed.error.issues });

        const dueFrom = parsed.data.dueFrom ? new Date(parsed.data.dueFrom) : undefined;
        const dueTo = parsed.data.dueTo ? new Date(parsed.data.dueTo) : undefined;

        const data = await listDebts({
            workspaceId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },

            kind: parsed.data.kind,
            status: parsed.data.status,
            visibility: parsed.data.visibility,

            dueFrom,
            dueTo,

            page: parsed.data.page,
            limit: parsed.data.limit,
        });

        return res.json({
            ...data,
            items: data.items.map((d) => d.toJSON()),
        });
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleUpdateDebt(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        const debtId = String(req.params.debtId ?? "");
        requireValidObjectIds({ workspaceId, debtId });

        const wa = requireWorkspaceAccess(req, workspaceId);

        const parsed = UpdateDebtSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ message: "Invalid body", issues: parsed.error.issues });

        const patch = {
            kind: parsed.data.kind,
            principal: parsed.data.principal,
            remaining: parsed.data.remaining,
            counterparty: parsed.data.counterparty,
            dueDate: parsed.data.dueDate === undefined ? undefined : (parsed.data.dueDate ? new Date(parsed.data.dueDate) : null),
            note: parsed.data.note ?? undefined,
            currency: parsed.data.currency,
            visibility: parsed.data.visibility,
            ownerUserId: parsed.data.ownerUserId ?? undefined,
            status: parsed.data.status,
        };

        const updated = await updateDebt({
            workspaceId,
            debtId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },
            patch,
        });

        return res.json(updated.toJSON());
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleDeleteDebt(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        const debtId = String(req.params.debtId ?? "");
        requireValidObjectIds({ workspaceId, debtId });

        const wa = requireWorkspaceAccess(req, workspaceId);

        const deleted = await softDeleteDebt({
            workspaceId,
            debtId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },
        });

        return res.json(deleted.toJSON());
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleRestoreDebt(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        const debtId = String(req.params.debtId ?? "");
        requireValidObjectIds({ workspaceId, debtId });

        const wa = requireWorkspaceAccess(req, workspaceId);

        const restored = await restoreDebt({
            workspaceId,
            debtId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },
        });

        return res.json(restored.toJSON());
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}