// src/themes/routes/theme.routes.ts

import { Router } from "express";

import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

import {
    getThemeByKeyController,
    listThemesController,
    updateThemeController,
} from "../controllers/theme.controller";
import {
    themeByKeyParamsSchema,
    themeParamsSchema,
    updateThemeSchema,
} from "../schemas/theme.schemas";
import type {
    ThemeByKeyParams,
    ThemeParams,
    UpdateThemeBody,
} from "../types/theme.types";

const themeRouter = Router({ mergeParams: true });

themeRouter.use(requireWorkspaceAccess());

themeRouter.get<ThemeParams>(
    "/",
    validateRequest(themeParamsSchema),
    requireWorkspacePermission("themes.read"),
    listThemesController
);

themeRouter.get<ThemeByKeyParams>(
    "/:themeKey",
    validateRequest(themeByKeyParamsSchema),
    requireWorkspacePermission("themes.read"),
    getThemeByKeyController
);

themeRouter.patch<ThemeByKeyParams, object, UpdateThemeBody>(
    "/:themeKey",
    validateRequest(themeByKeyParamsSchema),
    validateRequest(updateThemeSchema),
    requireWorkspacePermission("themes.update"),
    updateThemeController
);

export { themeRouter };