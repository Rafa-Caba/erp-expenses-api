// src/transactions/controllers/transactions.controller.ts

import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import {
    CreateTransactionSchema,
    ListTransactionsQuerySchema,
    UpdateTransactionSchema,
} from "@/src/transactions/schemas/transaction.schemas";

import {
    createTransaction,
    getTransactionWithLines,
    listTransactions,
    restoreTransaction,
    softDeleteTransaction,
    updateTransaction,
} from "@/src/transactions/services/transactions.service";

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

export async function handleCreateTransaction(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        requireValidObjectIds({ workspaceId });

        const wa = requireWorkspaceAccess(req, workspaceId);

        const parsed = CreateTransactionSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ message: "Invalid body", issues: parsed.error.issues });

        const date = parsed.data.date ? new Date(parsed.data.date) : new Date();

        const tx = await createTransaction({
            workspaceId,
            access: {
                actorUserId: userId,
                role: wa.role,
                workspaceKind: wa.workspaceKind,
            },
            type: parsed.data.type,
            date,
            currency: parsed.data.currency,
            visibility: parsed.data.visibility,
            note: parsed.data.note ?? null,
            tags: parsed.data.tags,
            ownerUserId: parsed.data.ownerUserId ?? null,
            debtId: parsed.data.debtId ?? null,
            attachments: parsed.data.attachments,
            lines: parsed.data.lines.map((l) => ({
                accountId: l.accountId,
                delta: l.delta,
                currency: l.currency,
                categoryId: l.categoryId ?? null,
                lineType: l.lineType,
                note: l.note ?? null,
            })),
        });

        return res.status(201).json(tx.toJSON());
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleGetTransaction(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        const transactionId = String(req.params.transactionId ?? "");
        requireValidObjectIds({ workspaceId, transactionId });

        const wa = requireWorkspaceAccess(req, workspaceId);

        const result = await getTransactionWithLines({
            workspaceId,
            transactionId,
            access: {
                actorUserId: userId,
                role: wa.role,
                workspaceKind: wa.workspaceKind,
            },
        });

        if (!result) return res.status(404).json({ message: "Transaction not found" });

        return res.json({
            transaction: result.tx.toJSON(),
            lines: result.lines.map((l) => l.toJSON()),
        });
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleListTransactions(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        requireValidObjectIds({ workspaceId });

        const wa = requireWorkspaceAccess(req, workspaceId);

        const parsed = ListTransactionsQuerySchema.safeParse(req.query);
        if (!parsed.success) return res.status(400).json({ message: "Invalid query", issues: parsed.error.issues });

        const from = parsed.data.from ? new Date(parsed.data.from) : undefined;
        const to = parsed.data.to ? new Date(parsed.data.to) : undefined;

        const data = await listTransactions({
            workspaceId,
            access: {
                actorUserId: userId,
                role: wa.role,
                workspaceKind: wa.workspaceKind,
            },
            from,
            to,
            type: parsed.data.type,
            accountId: parsed.data.accountId,
            categoryId: parsed.data.categoryId,
            visibility: parsed.data.visibility,

            tag: parsed.data.tag,
            ownerUserId: parsed.data.ownerUserId,
            debtId: parsed.data.debtId,

            page: parsed.data.page,
            limit: parsed.data.limit,
        });

        return res.json({
            ...data,
            items: data.items.map((t) => t.toJSON()),
        });
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleUpdateTransaction(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        const transactionId = String(req.params.transactionId ?? "");
        requireValidObjectIds({ workspaceId, transactionId });

        const wa = requireWorkspaceAccess(req, workspaceId);

        const parsed = UpdateTransactionSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ message: "Invalid body", issues: parsed.error.issues });

        const patch = {
            type: parsed.data.type,
            currency: parsed.data.currency,
            visibility: parsed.data.visibility,
            note: parsed.data.note ?? undefined,
            date: parsed.data.date ? new Date(parsed.data.date) : undefined,

            tags: parsed.data.tags,
            ownerUserId: parsed.data.ownerUserId ?? undefined,
            debtId: parsed.data.debtId ?? undefined,
            attachments: parsed.data.attachments,

            lines: parsed.data.lines
                ? parsed.data.lines.map((l) => ({
                    accountId: l.accountId,
                    delta: l.delta,
                    currency: l.currency,
                    categoryId: l.categoryId ?? null,
                    lineType: l.lineType,
                    note: l.note ?? null,
                }))
                : undefined,
        };

        const updated = await updateTransaction({
            workspaceId,
            transactionId,
            access: {
                actorUserId: userId,
                role: wa.role,
                workspaceKind: wa.workspaceKind,
            },
            patch,
        });

        if (!updated) return res.status(404).json({ message: "Transaction not found" });

        return res.json(updated.toJSON());
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleDeleteTransaction(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        const transactionId = String(req.params.transactionId ?? "");
        requireValidObjectIds({ workspaceId, transactionId });

        const wa = requireWorkspaceAccess(req, workspaceId);

        const deleted = await softDeleteTransaction({
            workspaceId,
            transactionId,
            access: {
                actorUserId: userId,
                role: wa.role,
                workspaceKind: wa.workspaceKind,
            },
        });

        if (!deleted) return res.status(404).json({ message: "Transaction not found" });

        return res.json(deleted.toJSON());
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleRestoreTransaction(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        const transactionId = String(req.params.transactionId ?? "");
        requireValidObjectIds({ workspaceId, transactionId });

        const wa = requireWorkspaceAccess(req, workspaceId);

        const restored = await restoreTransaction({
            workspaceId,
            transactionId,
            access: {
                actorUserId: userId,
                role: wa.role,
                workspaceKind: wa.workspaceKind,
            },
        });

        if (!restored) return res.status(404).json({ message: "Transaction not found" });

        return res.json(restored.toJSON());
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}