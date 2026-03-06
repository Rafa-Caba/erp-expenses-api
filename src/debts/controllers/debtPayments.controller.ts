// src/debts/controllers/debtPayments.controller.ts

import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import { CreateDebtPaymentSchema } from "@/src/debts/schemas/debtPayment.schemas";
import { createDebtPayment } from "@/src/debts/services/debtPayments.service";

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

export async function handleCreateDebtPayment(req: Request, res: Response, next: NextFunction) {
    try {
        const { id: userId } = requireUser(req);

        const workspaceId = String(req.params.workspaceId ?? "");
        const debtId = String(req.params.debtId ?? "");
        requireValidObjectIds({ workspaceId, debtId });

        const wa = requireWorkspaceAccess(req, workspaceId);

        const parsed = CreateDebtPaymentSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid body", issues: parsed.error.issues });
        }

        const paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date();

        // validate optional scheduleId if provided
        if (parsed.data.scheduleId && !mongoose.isValidObjectId(parsed.data.scheduleId)) {
            return res.status(400).json({ message: "Invalid scheduleId" });
        }

        const result = await createDebtPayment({
            workspaceId,
            debtId,
            access: { actorUserId: userId, role: wa.role, workspaceKind: wa.workspaceKind },

            amount: parsed.data.amount,
            paidAt,
            note: parsed.data.note ?? null,

            accountId: parsed.data.accountId,
            categoryId: parsed.data.categoryId ?? null,

            scheduleId: parsed.data.scheduleId ?? null,
        });

        return res.status(201).json({
            payment: result.payment.toJSON(),
            transaction: result.transaction.toJSON(),
            debt: result.debt.toJSON(),
            schedule: result.schedule ? result.schedule.toJSON() : null,
        });
    } catch (err) {
        const maybe = err as { status?: number; message?: string };
        if (maybe.status) return res.status(maybe.status).json({ message: maybe.message ?? "Error" });
        return next(err);
    }
}