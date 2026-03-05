// src/categories/controllers/categories.controller.ts

import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import {
    CategoriesListQuerySchema,
    CategoryIdParamsSchema,
    CreateCategorySchema,
    UpdateCategorySchema,
} from "@/src/categories/schemas/category.schemas";
import {
    createCategory,
    getCategoryById,
    listCategories,
    setCategoryActive,
    updateCategory,
} from "@/src/categories/services/categories.service";

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

export async function handleListCategories(req: Request, res: Response, next: NextFunction) {
    try {
        requireUserId(req);

        const workspaceId = String(req.params.workspaceId ?? "");
        assertValidObjectId(workspaceId, "workspaceId");

        const parsed = CategoriesListQuerySchema.safeParse(req.query);
        if (!parsed.success) return res.status(400).json({ message: "Invalid query", issues: parsed.error.issues });

        const items = await listCategories({
            workspaceId,
            includeInactive: parsed.data.includeInactive,
            type: parsed.data.type,
        });

        return res.json(items.map((x) => x.toJSON()));
    } catch (err) {
        const e = err as { status?: number; message?: string };
        if (e.status) return res.status(e.status).json({ message: e.message ?? "Error" });
        return next(err);
    }
}

export async function handleCreateCategory(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = requireUserId(req);

        const workspaceId = String(req.params.workspaceId ?? "");
        assertValidObjectId(workspaceId, "workspaceId");

        const wa = requireWorkspaceAccess(req, workspaceId);

        const parsed = CreateCategorySchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ message: "Invalid body", issues: parsed.error.issues });

        const doc = await createCategory({
            workspaceId,
            access: {
                actorUserId: userId,
                workspaceKind: wa.workspaceKind,
                role: wa.role,
            },
            input: {
                name: parsed.data.name,
                type: parsed.data.type,
                color: parsed.data.color ?? null,
                iconKey: parsed.data.iconKey ?? null,
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

export async function handleGetCategory(req: Request, res: Response, next: NextFunction) {
    try {
        requireUserId(req);

        const parsed = CategoryIdParamsSchema.safeParse(req.params);
        if (!parsed.success) return res.status(400).json({ message: "Invalid params", issues: parsed.error.issues });

        const { workspaceId, categoryId } = parsed.data;
        assertValidObjectId(workspaceId, "workspaceId");
        assertValidObjectId(categoryId, "categoryId");

        const doc = await getCategoryById({ workspaceId, categoryId });
        if (!doc) return res.status(404).json({ message: "Category not found" });

        return res.json(doc.toJSON());
    } catch (err) {
        const e = err as { status?: number; message?: string };
        if (e.status) return res.status(e.status).json({ message: e.message ?? "Error" });
        return next(err);
    }
}

export async function handlePatchCategory(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = requireUserId(req);

        const parsedParams = CategoryIdParamsSchema.safeParse(req.params);
        if (!parsedParams.success) return res.status(400).json({ message: "Invalid params", issues: parsedParams.error.issues });

        const parsedBody = UpdateCategorySchema.safeParse(req.body);
        if (!parsedBody.success) return res.status(400).json({ message: "Invalid body", issues: parsedBody.error.issues });

        const { workspaceId, categoryId } = parsedParams.data;
        assertValidObjectId(workspaceId, "workspaceId");
        assertValidObjectId(categoryId, "categoryId");

        const wa = requireWorkspaceAccess(req, workspaceId);

        const updated = await updateCategory({
            workspaceId,
            categoryId,
            access: {
                actorUserId: userId,
                workspaceKind: wa.workspaceKind,
                role: wa.role,
            },
            patch: {
                name: parsedBody.data.name,
                type: parsedBody.data.type,
                color: parsedBody.data.color ?? undefined,
                iconKey: parsedBody.data.iconKey ?? undefined,
                note: parsedBody.data.note ?? undefined,
            },
        });

        if (!updated) return res.status(404).json({ message: "Category not found" });

        return res.json(updated.toJSON());
    } catch (err) {
        const e = err as { status?: number; message?: string };
        if (e.status) return res.status(e.status).json({ message: e.message ?? "Error" });
        return next(err);
    }
}

export async function handleDisableCategory(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = requireUserId(req);

        const parsed = CategoryIdParamsSchema.safeParse(req.params);
        if (!parsed.success) return res.status(400).json({ message: "Invalid params", issues: parsed.error.issues });

        const { workspaceId, categoryId } = parsed.data;
        assertValidObjectId(workspaceId, "workspaceId");
        assertValidObjectId(categoryId, "categoryId");

        const wa = requireWorkspaceAccess(req, workspaceId);

        const updated = await setCategoryActive({
            workspaceId,
            categoryId,
            isActive: false,
            access: {
                actorUserId: userId,
                workspaceKind: wa.workspaceKind,
                role: wa.role,
            },
        });

        if (!updated) return res.status(404).json({ message: "Category not found" });

        return res.json(updated.toJSON());
    } catch (err) {
        const e = err as { status?: number; message?: string };
        if (e.status) return res.status(e.status).json({ message: e.message ?? "Error" });
        return next(err);
    }
}

export async function handleEnableCategory(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = requireUserId(req);

        const parsed = CategoryIdParamsSchema.safeParse(req.params);
        if (!parsed.success) return res.status(400).json({ message: "Invalid params", issues: parsed.error.issues });

        const { workspaceId, categoryId } = parsed.data;
        assertValidObjectId(workspaceId, "workspaceId");
        assertValidObjectId(categoryId, "categoryId");

        const wa = requireWorkspaceAccess(req, workspaceId);

        const updated = await setCategoryActive({
            workspaceId,
            categoryId,
            isActive: true,
            access: {
                actorUserId: userId,
                workspaceKind: wa.workspaceKind,
                role: wa.role,
            },
        });

        if (!updated) return res.status(404).json({ message: "Category not found" });

        return res.json(updated.toJSON());
    } catch (err) {
        const e = err as { status?: number; message?: string };
        if (e.status) return res.status(e.status).json({ message: e.message ?? "Error" });
        return next(err);
    }
}