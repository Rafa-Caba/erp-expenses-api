// src/categories/routes/categories.routes.ts

import { Router } from "express";
import { requireAuth } from "@/src/middlewares/requireAuth";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import {
    handleCreateCategory,
    handleDisableCategory,
    handleEnableCategory,
    handleGetCategory,
    handleListCategories,
    handlePatchCategory,
} from "@/src/categories/controllers/categories.controller";

export const categoriesRouter = Router({ mergeParams: true });

categoriesRouter.use(requireAuth);
categoriesRouter.use(requireWorkspaceAccess("workspaceId"));

categoriesRouter.get("/", handleListCategories);
categoriesRouter.post("/", handleCreateCategory);

categoriesRouter.get("/:categoryId", handleGetCategory);
categoriesRouter.patch("/:categoryId", handlePatchCategory);
categoriesRouter.patch("/:categoryId/disable", handleDisableCategory);
categoriesRouter.patch("/:categoryId/enable", handleEnableCategory);