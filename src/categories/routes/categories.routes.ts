// src/categories/routes/categories.routes.ts

import { Router } from "express";

import {
    archiveCategoryController,
    createCategoryController,
    getCategoriesController,
    getCategoryByIdController,
    updateCategoryController,
} from "../controllers/categories.controller";
import {
    categoryParamsSchema,
    createCategorySchema,
    updateCategorySchema,
    workspaceCategoryParamsSchema,
} from "../schemas/category.schemas";
import type {
    CategoryParams,
    CreateCategoryBody,
    UpdateCategoryBody,
    WorkspaceCategoryParams,
} from "../types/category.types";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

const categoryRouter = Router({ mergeParams: true });

categoryRouter.use(requireWorkspaceAccess());

categoryRouter.get<WorkspaceCategoryParams>(
    "/",
    validateRequest(workspaceCategoryParamsSchema),
    requireWorkspacePermission("categories.read"),
    getCategoriesController
);

categoryRouter.get<CategoryParams>(
    "/:categoryId",
    validateRequest(categoryParamsSchema),
    requireWorkspacePermission("categories.read"),
    getCategoryByIdController
);

categoryRouter.post<WorkspaceCategoryParams, object, CreateCategoryBody>(
    "/",
    validateRequest(workspaceCategoryParamsSchema),
    validateRequest(createCategorySchema),
    requireWorkspacePermission("categories.create"),
    createCategoryController
);

categoryRouter.patch<CategoryParams, object, UpdateCategoryBody>(
    "/:categoryId",
    validateRequest(categoryParamsSchema),
    validateRequest(updateCategorySchema),
    requireWorkspacePermission("categories.update"),
    updateCategoryController
);

categoryRouter.delete<CategoryParams>(
    "/:categoryId",
    validateRequest(categoryParamsSchema),
    requireWorkspacePermission("categories.delete"),
    archiveCategoryController
);

export { categoryRouter };