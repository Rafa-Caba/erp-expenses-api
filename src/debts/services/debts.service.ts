// src/debts/services/debts.service.ts

import mongoose from "mongoose";
import { DebtModel, type DebtStatus } from "@/src/debts/models/Debt.model";
import type { Visibility } from "@/src/shared/types/finance";
import type { WorkspaceKind, WorkspaceRole } from "@/src/types/express";
import { canManageWorkspaceResources } from "@/src/shared/security/workspacePermissions";

type AccessContext = {
    actorUserId: string;
    workspaceKind: WorkspaceKind;
    role: WorkspaceRole;
};

function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

function toObjectId(id: string, label: string): mongoose.Types.ObjectId {
    if (!mongoose.isValidObjectId(id)) {
        const e = new Error(`Invalid ${label}`);
        (e as { status?: number }).status = 400;
        throw e;
    }
    return new mongoose.Types.ObjectId(id);
}

/**
 * Visibility rules:
 * - SHARED: visible to all workspace members
 * - PRIVATE: visible ONLY to ownerUserId (even if role is OWNER/ADMIN)
 */
function buildDebtVisibilityMatch(params: {
    actorUserId: string;
    requested?: Visibility;
}) {
    if (!params.requested) {
        return {
            $or: [
                { visibility: "SHARED" as const },
                {
                    visibility: "PRIVATE" as const,
                    ownerUserId: new mongoose.Types.ObjectId(params.actorUserId),
                },
            ],
        };
    }

    if (params.requested === "SHARED") return { visibility: "SHARED" as const };
    return {
        visibility: "PRIVATE" as const,
        ownerUserId: new mongoose.Types.ObjectId(params.actorUserId),
    };
}

function assertOwnerRules(input: { visibility: Visibility; ownerUserId: string | null }) {
    if (input.visibility === "PRIVATE" && !input.ownerUserId) {
        const e = new Error("ownerUserId is required when visibility is PRIVATE");
        (e as { status?: number }).status = 400;
        throw e;
    }
}

/**
 * Mutability rules (aligned to your transactions philosophy):
 *
 * PRIVATE:
 *  - mutate: only ownerUserId
 *
 * SHARED:
 *  - workspaceKind INDIVIDUAL: "mis cosas" => only owner (if owner exists) else creator
 *  - workspaceKind SHARED: creator OR privileged role (OWNER/ADMIN)
 */
function canMutateDebt(input: {
    access: AccessContext;
    visibility: Visibility;
    ownerUserId: string | null;
    createdByUserId: string;
}) {
    const actor = input.access.actorUserId;
    const owner = input.ownerUserId;

    if (input.visibility === "PRIVATE") {
        return owner === actor;
    }

    // visibility === SHARED
    if (input.access.workspaceKind === "INDIVIDUAL") {
        // INDIVIDUAL: only owner exists (or should).
        // If owner exists, only owner can mutate; else creator (fallback).
        if (owner) return owner === actor;
        return input.createdByUserId === actor;
    }

    // SHARED workspace:
    if (input.createdByUserId === actor) return true;

    // OWNER/ADMIN can manage workspace resources (your existing helper)
    return canManageWorkspaceResources({
        workspaceKind: input.access.workspaceKind,
        role: input.access.role,
    });
}

export async function createDebt(params: {
    workspaceId: string;
    access: AccessContext;

    kind: "I_OWE" | "OWE_ME";
    principal: number;
    remaining?: number;

    counterparty: string;
    dueDate?: Date | null;

    currency: "MXN" | "USD";
    visibility: Visibility;
    ownerUserId: string | null;

    status: DebtStatus;
    note: string | null;
}) {
    assertOwnerRules({ visibility: params.visibility, ownerUserId: params.ownerUserId });

    const principal = round2(params.principal);
    const remaining = round2(params.remaining ?? params.principal);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const debtDocs = await DebtModel.create(
            [
                {
                    workspaceId: toObjectId(params.workspaceId, "workspaceId"),
                    kind: params.kind,
                    currency: params.currency,
                    visibility: params.visibility,
                    ownerUserId: params.ownerUserId ? toObjectId(params.ownerUserId, "ownerUserId") : null,
                    counterparty: params.counterparty,
                    principal,
                    remaining,
                    dueDate: params.dueDate ?? null,
                    note: params.note ?? null,
                    status: params.status,
                    isDeleted: false,
                    deletedAt: null,
                    createdByUserId: toObjectId(params.access.actorUserId, "actorUserId"),
                    updatedByUserId: null,
                },
            ],
            { session }
        );

        await session.commitTransaction();
        return debtDocs[0];
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

export async function getDebt(params: { workspaceId: string; debtId: string; access: AccessContext }) {
    const matchVisibility = buildDebtVisibilityMatch({ actorUserId: params.access.actorUserId });

    return DebtModel.findOne({
        _id: toObjectId(params.debtId, "debtId"),
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: false,
        ...matchVisibility,
    });
}

export async function listDebts(params: {
    workspaceId: string;
    access: AccessContext;

    kind?: "I_OWE" | "OWE_ME";
    status?: DebtStatus;
    visibility?: Visibility;

    dueFrom?: Date;
    dueTo?: Date;

    page: number;
    limit: number;
}) {
    const matchVisibility = buildDebtVisibilityMatch({
        actorUserId: params.access.actorUserId,
        requested: params.visibility,
    });

    const match: Record<string, any> = {
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: false,
        ...matchVisibility,
    };

    if (params.kind) match.kind = params.kind;
    if (params.status) match.status = params.status;

    if (params.dueFrom || params.dueTo) {
        match.dueDate = {};
        if (params.dueFrom) match.dueDate.$gte = params.dueFrom;
        if (params.dueTo) match.dueDate.$lte = params.dueTo;
    }

    const page = Math.max(1, params.page);
    const limit = Math.min(100, Math.max(1, params.limit));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
        DebtModel.find(match).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
        DebtModel.countDocuments(match),
    ]);

    return {
        items,
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
    };
}

export async function updateDebt(params: {
    workspaceId: string;
    debtId: string;
    access: AccessContext;
    patch: Partial<{
        kind: "I_OWE" | "OWE_ME";
        principal: number;
        remaining: number;
        counterparty: string;
        dueDate: Date | null;
        currency: "MXN" | "USD";
        visibility: Visibility;
        ownerUserId: string | null;
        status: DebtStatus;
        note: string | null;
    }>;
}) {
    const debt = await DebtModel.findOne({
        _id: toObjectId(params.debtId, "debtId"),
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: false,
    });

    if (!debt) {
        const e = new Error("Debt not found");
        (e as { status?: number }).status = 404;
        throw e;
    }

    const createdBy = String(debt.createdByUserId);
    const owner = debt.ownerUserId ? String(debt.ownerUserId) : null;

    if (
        !canMutateDebt({
            access: params.access,
            visibility: debt.visibility,
            ownerUserId: owner,
            createdByUserId: createdBy,
        })
    ) {
        const e = new Error("Forbidden");
        (e as { status?: number }).status = 403;
        throw e;
    }

    const nextVisibility = (params.patch.visibility ?? debt.visibility) as Visibility;
    const nextOwnerUserId =
        params.patch.ownerUserId === undefined ? owner : (params.patch.ownerUserId ?? null);

    assertOwnerRules({ visibility: nextVisibility, ownerUserId: nextOwnerUserId });

    if (params.patch.kind !== undefined) debt.kind = params.patch.kind;
    if (params.patch.counterparty !== undefined) debt.counterparty = params.patch.counterparty;

    if (params.patch.currency !== undefined) debt.currency = params.patch.currency;

    if (params.patch.principal !== undefined) debt.principal = round2(params.patch.principal);
    if (params.patch.remaining !== undefined) debt.remaining = round2(params.patch.remaining);

    if (params.patch.dueDate !== undefined) debt.dueDate = params.patch.dueDate ?? null;
    if (params.patch.note !== undefined) debt.note = params.patch.note ?? null;

    if (params.patch.visibility !== undefined) debt.visibility = params.patch.visibility;
    if (params.patch.ownerUserId !== undefined) {
        debt.ownerUserId = nextOwnerUserId ? toObjectId(nextOwnerUserId, "ownerUserId") : null;
    }

    if (params.patch.status !== undefined) debt.status = params.patch.status;

    debt.updatedByUserId = toObjectId(params.access.actorUserId, "actorUserId");

    await debt.save();
    return debt;
}

export async function softDeleteDebt(params: { workspaceId: string; debtId: string; access: AccessContext }) {
    const debt = await DebtModel.findOne({
        _id: toObjectId(params.debtId, "debtId"),
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: false,
    });

    if (!debt) {
        const e = new Error("Debt not found");
        (e as { status?: number }).status = 404;
        throw e;
    }

    const createdBy = String(debt.createdByUserId);
    const owner = debt.ownerUserId ? String(debt.ownerUserId) : null;

    if (
        !canMutateDebt({
            access: params.access,
            visibility: debt.visibility,
            ownerUserId: owner,
            createdByUserId: createdBy,
        })
    ) {
        const e = new Error("Forbidden");
        (e as { status?: number }).status = 403;
        throw e;
    }

    debt.isDeleted = true;
    debt.deletedAt = new Date();
    debt.updatedByUserId = toObjectId(params.access.actorUserId, "actorUserId");

    await debt.save();
    return debt;
}

export async function restoreDebt(params: { workspaceId: string; debtId: string; access: AccessContext }) {
    const debt = await DebtModel.findOne({
        _id: toObjectId(params.debtId, "debtId"),
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: true,
    });

    if (!debt) {
        const e = new Error("Debt not found");
        (e as { status?: number }).status = 404;
        throw e;
    }

    const createdBy = String(debt.createdByUserId);
    const owner = debt.ownerUserId ? String(debt.ownerUserId) : null;

    if (
        !canMutateDebt({
            access: params.access,
            visibility: debt.visibility,
            ownerUserId: owner,
            createdByUserId: createdBy,
        })
    ) {
        const e = new Error("Forbidden");
        (e as { status?: number }).status = 403;
        throw e;
    }

    debt.isDeleted = false;
    debt.deletedAt = null;
    debt.updatedByUserId = toObjectId(params.access.actorUserId, "actorUserId");

    await debt.save();
    return debt;
}