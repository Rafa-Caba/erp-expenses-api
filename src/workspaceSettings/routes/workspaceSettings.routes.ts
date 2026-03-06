// src/workspaceSettings/routes/workspaceSettings.routes.ts

import { Router } from "express";

import {
    getWorkspaceSettingsController,
    updateWorkspaceSettingsController,
} from "../controllers/workspaceSettings.controller";
import {
    updateWorkspaceSettingsSchema,
    workspaceSettingsParamsSchema,
} from "../schemas/workspaceSettings.schemas";
import type {
    UpdateWorkspaceSettingsBody,
    WorkspaceSettingsParams,
} from "../types/workspaceSettings.types";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

const workspaceSettingsRouter = Router({ mergeParams: true });

workspaceSettingsRouter.use(requireWorkspaceAccess());

workspaceSettingsRouter.get<WorkspaceSettingsParams>(
    "/",
    validateRequest(workspaceSettingsParamsSchema),
    requireWorkspacePermission("workspace.settings.read"),
    getWorkspaceSettingsController
);

workspaceSettingsRouter.patch<
    WorkspaceSettingsParams,
    object,
    UpdateWorkspaceSettingsBody
>(
    "/",
    validateRequest(workspaceSettingsParamsSchema),
    validateRequest(updateWorkspaceSettingsSchema),
    requireWorkspacePermission("workspace.settings.update"),
    updateWorkspaceSettingsController
);

export { workspaceSettingsRouter };