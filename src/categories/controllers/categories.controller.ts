// src/categories/controllers/categories.controller.ts

import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    archiveCategoryService,
    createCategoryService,
    getCategoriesService,
    getCategoryByIdService,
    isCategoryServiceError,
    updateCategoryService,
    CategoryServiceError,
} from "../services/categories.service";
import type {
    CategoryParams,
    CreateCategoryBody,
    UpdateCategoryBody,
    WorkspaceCategoryParams,
} from "../types/category.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new CategoryServiceError(
            "El id proporcionado no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(value);
}

export const getCategoriesController: RequestHandler<
    WorkspaceCategoryParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const categories = await getCategoriesService(workspaceId);

        res.status(200).json({
            message: "Categorías obtenidas correctamente.",
            categories,
        });
    } catch (error) {
        if (error instanceof Error && isCategoryServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const getCategoryByIdController: RequestHandler<
    CategoryParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const categoryId = getObjectIdOrThrow(req.params.categoryId);

        const category = await getCategoryByIdService(workspaceId, categoryId);

        if (!category) {
            res.status(404).json({
                code: "CATEGORY_NOT_FOUND",
                message: "Categoría no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Categoría obtenida correctamente.",
            category,
        });
    } catch (error) {
        if (error instanceof Error && isCategoryServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const createCategoryController: RequestHandler<
    WorkspaceCategoryParams,
    object,
    CreateCategoryBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);

        const category = await createCategoryService({
            workspaceId,
            body: req.body,
            workspace: req.workspace,
        });

        res.status(201).json({
            message: "Categoría creada correctamente.",
            category,
        });
    } catch (error) {
        if (error instanceof Error && isCategoryServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updateCategoryController: RequestHandler<
    CategoryParams,
    object,
    UpdateCategoryBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const categoryId = getObjectIdOrThrow(req.params.categoryId);

        const category = await updateCategoryService({
            workspaceId,
            categoryId,
            body: req.body,
            workspace: req.workspace,
        });

        if (!category) {
            res.status(404).json({
                code: "CATEGORY_NOT_FOUND",
                message: "Categoría no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Categoría actualizada correctamente.",
            category,
        });
    } catch (error) {
        if (error instanceof Error && isCategoryServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const archiveCategoryController: RequestHandler<
    CategoryParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const categoryId = getObjectIdOrThrow(req.params.categoryId);

        const category = await archiveCategoryService({
            workspaceId,
            categoryId,
            workspace: req.workspace,
        });

        if (!category) {
            res.status(404).json({
                code: "CATEGORY_NOT_FOUND",
                message: "Categoría no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Categoría archivada correctamente.",
            category,
        });
    } catch (error) {
        if (error instanceof Error && isCategoryServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};