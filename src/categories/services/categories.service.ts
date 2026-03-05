// src/categories/services/categories.service.ts

import mongoose from "mongoose";
import { CategoryModel } from "@/src/categories/models/Category.model";
import type { WorkspaceKind, WorkspaceRole } from "@/src/types/express";
import { canManageWorkspaceResources } from "@/src/shared/security/workspacePermissions";

type AccessContext = {
    actorUserId: string;
    workspaceKind: WorkspaceKind;
    role: WorkspaceRole;
};

type CreateCategoryInput = {
    name: string;
    type: "INCOME" | "EXPENSE";
    color: string | null;
    iconKey: string | null;
    note: string | null;
};

type UpdateCategoryPatch = Partial<{
    name: string;
    type: "INCOME" | "EXPENSE";
    color: string | null;
    iconKey: string | null;
    note: string | null;
}>;

function assertCanManage(access: AccessContext) {
    if (!canManageWorkspaceResources({ workspaceKind: access.workspaceKind, role: access.role })) {
        const e = new Error("Forbidden");
        (e as { status?: number }).status = 403;
        throw e;
    }
}

export async function listCategories(params: {
    workspaceId: string;
    includeInactive: boolean;
    type?: "INCOME" | "EXPENSE";
}) {
    const match: Record<string, unknown> = {
        workspaceId: new mongoose.Types.ObjectId(params.workspaceId),
    };

    if (!params.includeInactive) match.isActive = true;
    if (params.type) match.type = params.type;

    const items = await CategoryModel.find(match).sort({ isActive: -1, type: 1, name: 1 });
    return items;
}

export async function createCategory(params: {
    workspaceId: string;
    access: AccessContext;
    input: CreateCategoryInput;
}) {
    assertCanManage(params.access);

    const doc = await CategoryModel.create({
        workspaceId: new mongoose.Types.ObjectId(params.workspaceId),
        name: params.input.name,
        type: params.input.type,
        color: params.input.color,
        iconKey: params.input.iconKey,
        note: params.input.note,

        isActive: true,

        createdByUserId: new mongoose.Types.ObjectId(params.access.actorUserId),
        updatedByUserId: null,
    });

    return doc;
}

export async function getCategoryById(params: {
    workspaceId: string;
    categoryId: string;
}) {
    return CategoryModel.findOne({
        _id: new mongoose.Types.ObjectId(params.categoryId),
        workspaceId: new mongoose.Types.ObjectId(params.workspaceId),
    });
}

export async function updateCategory(params: {
    workspaceId: string;
    categoryId: string;
    access: AccessContext;
    patch: UpdateCategoryPatch;
}) {
    assertCanManage(params.access);

    const doc = await CategoryModel.findOne({
        _id: new mongoose.Types.ObjectId(params.categoryId),
        workspaceId: new mongoose.Types.ObjectId(params.workspaceId),
    });

    if (!doc) return null;

    if (params.patch.name !== undefined) doc.name = params.patch.name;
    if (params.patch.type !== undefined) doc.type = params.patch.type;
    if (params.patch.color !== undefined) doc.color = params.patch.color;
    if (params.patch.iconKey !== undefined) doc.iconKey = params.patch.iconKey;
    if (params.patch.note !== undefined) doc.note = params.patch.note;

    doc.updatedByUserId = new mongoose.Types.ObjectId(params.access.actorUserId);

    await doc.save();
    return doc;
}

export async function setCategoryActive(params: {
    workspaceId: string;
    categoryId: string;
    access: AccessContext;
    isActive: boolean;
}) {
    assertCanManage(params.access);

    const doc = await CategoryModel.findOne({
        _id: new mongoose.Types.ObjectId(params.categoryId),
        workspaceId: new mongoose.Types.ObjectId(params.workspaceId),
    });

    if (!doc) return null;

    doc.isActive = params.isActive;
    doc.updatedByUserId = new mongoose.Types.ObjectId(params.access.actorUserId);

    await doc.save();
    return doc;
}