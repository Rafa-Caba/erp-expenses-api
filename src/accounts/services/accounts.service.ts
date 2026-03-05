// src/accounts/services/accounts.service.ts

import mongoose from "mongoose";
import { AccountModel } from "@/src/accounts/models/Account.model";
import type { WorkspaceKind, WorkspaceRole } from "@/src/types/express";
import { canManageWorkspaceResources } from "@/src/shared/security/workspacePermissions";

type AccessContext = {
    actorUserId: string;
    workspaceKind: WorkspaceKind;
    role: WorkspaceRole;
};

type CreateAccountInput = {
    name: string;
    type: "CASH" | "BANK" | "CREDIT_CARD";
    currency: "MXN" | "USD";
    initialBalance: number;
    note: string | null;
};

type UpdateAccountPatch = Partial<{
    name: string;
    type: "CASH" | "BANK" | "CREDIT_CARD";
    currency: "MXN" | "USD";
    note: string | null;
}>;

function assertCanManage(access: AccessContext) {
    if (!canManageWorkspaceResources({ workspaceKind: access.workspaceKind, role: access.role })) {
        const e = new Error("Forbidden");
        (e as { status?: number }).status = 403;
        throw e;
    }
}

export async function listAccounts(params: {
    workspaceId: string;
    includeInactive: boolean;
}) {
    const match: Record<string, unknown> = {
        workspaceId: new mongoose.Types.ObjectId(params.workspaceId),
    };

    if (!params.includeInactive) {
        match.isActive = true;
    }

    const items = await AccountModel.find(match).sort({ isActive: -1, name: 1 });
    return items;
}

export async function createAccount(params: {
    workspaceId: string;
    access: AccessContext;
    input: CreateAccountInput;
}) {
    assertCanManage(params.access);

    const doc = await AccountModel.create({
        workspaceId: new mongoose.Types.ObjectId(params.workspaceId),
        name: params.input.name,
        type: params.input.type,
        currency: params.input.currency,
        initialBalance: params.input.initialBalance,
        note: params.input.note,

        isActive: true,

        createdByUserId: new mongoose.Types.ObjectId(params.access.actorUserId),
        updatedByUserId: null,
    });

    return doc;
}

export async function getAccountById(params: {
    workspaceId: string;
    accountId: string;
}) {
    const doc = await AccountModel.findOne({
        _id: new mongoose.Types.ObjectId(params.accountId),
        workspaceId: new mongoose.Types.ObjectId(params.workspaceId),
    });

    return doc;
}

export async function updateAccount(params: {
    workspaceId: string;
    accountId: string;
    access: AccessContext;
    patch: UpdateAccountPatch;
}) {
    assertCanManage(params.access);

    const doc = await AccountModel.findOne({
        _id: new mongoose.Types.ObjectId(params.accountId),
        workspaceId: new mongoose.Types.ObjectId(params.workspaceId),
    });

    if (!doc) return null;

    if (params.patch.name !== undefined) doc.name = params.patch.name;
    if (params.patch.type !== undefined) doc.type = params.patch.type;
    if (params.patch.currency !== undefined) doc.currency = params.patch.currency;
    if (params.patch.note !== undefined) doc.note = params.patch.note;

    doc.updatedByUserId = new mongoose.Types.ObjectId(params.access.actorUserId);

    await doc.save();
    return doc;
}

export async function setAccountActive(params: {
    workspaceId: string;
    accountId: string;
    access: AccessContext;
    isActive: boolean;
}) {
    assertCanManage(params.access);

    const doc = await AccountModel.findOne({
        _id: new mongoose.Types.ObjectId(params.accountId),
        workspaceId: new mongoose.Types.ObjectId(params.workspaceId),
    });

    if (!doc) return null;

    doc.isActive = params.isActive;
    doc.updatedByUserId = new mongoose.Types.ObjectId(params.access.actorUserId);

    await doc.save();
    return doc;
}