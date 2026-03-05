// src/accounts/controllers/accounts.controller.ts

import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import {
    AccountIdParamsSchema,
    AccountsListQuerySchema,
    CreateAccountSchema,
    UpdateAccountSchema,
} from "@/src/accounts/schemas/account.schemas";
import {
    createAccount,
    getAccountById,
    listAccounts,
    setAccountActive,
    updateAccount,
} from "@/src/accounts/services/accounts.service";

function requireUserId(req: Request): string {
    const id = req.user?.id;
    if (!id) {
        const e = new Error("Unauthorized");
        (e as { status?: number }).status = 401;
        throw e;
    }
    return id;
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

function assertValidObjectId(id: string, name: string) {
    if (!mongoose.isValidObjectId(id)) {
        const e = new Error(`Invalid ${name}`);
        (e as { status?: number }).status = 400;
        throw e;
    }
}

export async function handleListAccounts(req: Request, res: Response, next: NextFunction) {
    try {
        requireUserId(req);

        const workspaceId = String(req.params.workspaceId ?? "");
        assertValidObjectId(workspaceId, "workspaceId");

        const parsed = AccountsListQuerySchema.safeParse(req.query);
        if (!parsed.success) return res.status(400).json({ message: "Invalid query", issues: parsed.error.issues });

        const items = await listAccounts({
            workspaceId,
            includeInactive: parsed.data.includeInactive,
        });

        return res.json(items.map((x) => x.toJSON()));
    } catch (err) {
        const e = err as { status?: number; message?: string };
        if (e.status) return res.status(e.status).json({ message: e.message ?? "Error" });
        return next(err);
    }
}

export async function handleCreateAccount(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = requireUserId(req);

        const workspaceId = String(req.params.workspaceId ?? "");
        assertValidObjectId(workspaceId, "workspaceId");

        const wa = requireWorkspaceAccess(req, workspaceId);

        const parsed = CreateAccountSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ message: "Invalid body", issues: parsed.error.issues });

        const doc = await createAccount({
            workspaceId,
            access: {
                actorUserId: userId,
                workspaceKind: wa.workspaceKind,
                role: wa.role,
            },
            input: {
                name: parsed.data.name,
                type: parsed.data.type,
                currency: parsed.data.currency,
                initialBalance: parsed.data.initialBalance,
                note: parsed.data.note ?? null,
            },
        });

        return res.status(201).json(doc.toJSON());
    } catch (err) {
        const e = err as { status?: number; message?: string };
        if (e.status) return res.status(e.status).json({ message: e.message ?? "Error" });
        return next(err);
    }
}

export async function handleGetAccount(req: Request, res: Response, next: NextFunction) {
    try {
        requireUserId(req);

        const parsed = AccountIdParamsSchema.safeParse(req.params);
        if (!parsed.success) return res.status(400).json({ message: "Invalid params", issues: parsed.error.issues });

        const { workspaceId, accountId } = parsed.data;
        assertValidObjectId(workspaceId, "workspaceId");
        assertValidObjectId(accountId, "accountId");

        const doc = await getAccountById({ workspaceId, accountId });
        if (!doc) return res.status(404).json({ message: "Account not found" });

        return res.json(doc.toJSON());
    } catch (err) {
        const e = err as { status?: number; message?: string };
        if (e.status) return res.status(e.status).json({ message: e.message ?? "Error" });
        return next(err);
    }
}

export async function handlePatchAccount(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = requireUserId(req);

        const parsedParams = AccountIdParamsSchema.safeParse(req.params);
        if (!parsedParams.success) return res.status(400).json({ message: "Invalid params", issues: parsedParams.error.issues });

        const parsedBody = UpdateAccountSchema.safeParse(req.body);
        if (!parsedBody.success) return res.status(400).json({ message: "Invalid body", issues: parsedBody.error.issues });

        const { workspaceId, accountId } = parsedParams.data;
        assertValidObjectId(workspaceId, "workspaceId");
        assertValidObjectId(accountId, "accountId");

        const wa = requireWorkspaceAccess(req, workspaceId);

        const updated = await updateAccount({
            workspaceId,
            accountId,
            access: {
                actorUserId: userId,
                workspaceKind: wa.workspaceKind,
                role: wa.role,
            },
            patch: {
                name: parsedBody.data.name,
                type: parsedBody.data.type,
                currency: parsedBody.data.currency,
                note: parsedBody.data.note ?? undefined,
            },
        });

        if (!updated) return res.status(404).json({ message: "Account not found" });

        return res.json(updated.toJSON());
    } catch (err) {
        const e = err as { status?: number; message?: string };
        if (e.status) return res.status(e.status).json({ message: e.message ?? "Error" });
        return next(err);
    }
}

export async function handleDisableAccount(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = requireUserId(req);

        const parsed = AccountIdParamsSchema.safeParse(req.params);
        if (!parsed.success) return res.status(400).json({ message: "Invalid params", issues: parsed.error.issues });

        const { workspaceId, accountId } = parsed.data;
        assertValidObjectId(workspaceId, "workspaceId");
        assertValidObjectId(accountId, "accountId");

        const wa = requireWorkspaceAccess(req, workspaceId);

        const updated = await setAccountActive({
            workspaceId,
            accountId,
            isActive: false,
            access: {
                actorUserId: userId,
                workspaceKind: wa.workspaceKind,
                role: wa.role,
            },
        });

        if (!updated) return res.status(404).json({ message: "Account not found" });

        return res.json(updated.toJSON());
    } catch (err) {
        const e = err as { status?: number; message?: string };
        if (e.status) return res.status(e.status).json({ message: e.message ?? "Error" });
        return next(err);
    }
}

export async function handleEnableAccount(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = requireUserId(req);

        const parsed = AccountIdParamsSchema.safeParse(req.params);
        if (!parsed.success) return res.status(400).json({ message: "Invalid params", issues: parsed.error.issues });

        const { workspaceId, accountId } = parsed.data;
        assertValidObjectId(workspaceId, "workspaceId");
        assertValidObjectId(accountId, "accountId");

        const wa = requireWorkspaceAccess(req, workspaceId);

        const updated = await setAccountActive({
            workspaceId,
            accountId,
            isActive: true,
            access: {
                actorUserId: userId,
                workspaceKind: wa.workspaceKind,
                role: wa.role,
            },
        });

        if (!updated) return res.status(404).json({ message: "Account not found" });

        return res.json(updated.toJSON());
    } catch (err) {
        const e = err as { status?: number; message?: string };
        if (e.status) return res.status(e.status).json({ message: e.message ?? "Error" });
        return next(err);
    }
}