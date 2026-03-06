// src/scheduled/controllers/scheduledAutomation.controller.ts

import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { GeneratePendingQuerySchema, UpcomingQuerySchema, PayOccurrenceSchema } from "@/src/scheduled/schemas/scheduled.schemas";
import { generatePendingOccurrences } from "@/src/scheduled/services/scheduledAutomation.service";
import { listUpcomingOccurrences, payOccurrence } from "@/src/scheduled/services/scheduledOccurrences.service";

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

export async function handleGeneratePending(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        requireValidObjectIds({ workspaceId });
        const wa = requireWorkspaceAccess(req, workspaceId);

        const parsed = GeneratePendingQuerySchema.safeParse(req.query);
        if (!parsed.success) return res.status(400).json({ message: "Invalid query", issues: parsed.error.issues });

        const out = await generatePendingOccurrences({
            workspaceId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },
            horizonDays: parsed.data.horizonDays,
        });

        return res.json(out);
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handleUpcoming(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        requireValidObjectIds({ workspaceId });
        const wa = requireWorkspaceAccess(req, workspaceId);

        const parsed = UpcomingQuerySchema.safeParse(req.query);
        if (!parsed.success) return res.status(400).json({ message: "Invalid query", issues: parsed.error.issues });

        const items = await listUpcomingOccurrences({
            workspaceId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },
            days: parsed.data.days,
        });

        return res.json(items.map((x) => x.toJSON()));
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}

export async function handlePayOccurrence(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);
        const workspaceId = String(req.params.workspaceId ?? "");
        const occurrenceId = String(req.params.occurrenceId ?? "");
        requireValidObjectIds({ workspaceId, occurrenceId });
        const wa = requireWorkspaceAccess(req, workspaceId);

        const parsed = PayOccurrenceSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ message: "Invalid body", issues: parsed.error.issues });

        const paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date();

        const result = await payOccurrence({
            workspaceId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },
            occurrenceId,
            accountId: parsed.data.accountId,
            categoryId: parsed.data.categoryId ?? null,
            note: parsed.data.note ?? null,
            paidAt,
        });

        return res.status(201).json({
            occurrence: result.occurrence.toJSON(),
            transaction: result.transaction.toJSON(),
        });
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}