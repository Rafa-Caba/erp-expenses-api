// src/workspaces/routes/workspaceMember.routes.ts

import { Router } from "express";

import {
    createWorkspaceMemberController,
    deleteWorkspaceMemberController,
    getWorkspaceMembersController,
    updateWorkspaceMemberController,
    updateWorkspaceMemberStatusController,
} from "../controllers/workspaceMember.controller";
import {
    createWorkspaceMemberSchema,
    updateWorkspaceMemberSchema,
    updateWorkspaceMemberStatusSchema,
    workspaceMemberByIdParamsSchema,
    workspaceMemberParamsSchema,
} from "../schemas/workspaceMember.schemas";
import type {
    CreateWorkspaceMemberBody,
    UpdateWorkspaceMemberBody,
    UpdateWorkspaceMemberStatusBody,
    WorkspaceMemberByIdParams,
    WorkspaceMemberParams,
} from "../types/workspaceMember.types";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { validateRequest } from "@/src/middlewares/validateRequest";

const workspaceMemberRouter = Router({ mergeParams: true });

workspaceMemberRouter.use(requireWorkspaceAccess());

workspaceMemberRouter.get<WorkspaceMemberParams>(
    "/",
    validateRequest(workspaceMemberParamsSchema),
    requireWorkspacePermission("workspace.members.read"),
    getWorkspaceMembersController
);

workspaceMemberRouter.post<WorkspaceMemberParams, object, CreateWorkspaceMemberBody>(
    "/",
    validateRequest(workspaceMemberParamsSchema),
    validateRequest(createWorkspaceMemberSchema),
    requireWorkspacePermission("workspace.members.create"),
    createWorkspaceMemberController
);

workspaceMemberRouter.patch<
    WorkspaceMemberByIdParams,
    object,
    UpdateWorkspaceMemberBody
>(
    "/:memberId",
    validateRequest(workspaceMemberByIdParamsSchema),
    validateRequest(updateWorkspaceMemberSchema),
    requireWorkspacePermission("workspace.members.update"),
    updateWorkspaceMemberController
);

workspaceMemberRouter.patch<
    WorkspaceMemberByIdParams,
    object,
    UpdateWorkspaceMemberStatusBody
>(
    "/:memberId/status",
    validateRequest(workspaceMemberByIdParamsSchema),
    validateRequest(updateWorkspaceMemberStatusSchema),
    requireWorkspacePermission("workspace.members.status.update"),
    updateWorkspaceMemberStatusController
);

workspaceMemberRouter.delete<WorkspaceMemberByIdParams>(
    "/:memberId",
    validateRequest(workspaceMemberByIdParamsSchema),
    requireWorkspacePermission("workspace.members.delete"),
    deleteWorkspaceMemberController
);

export { workspaceMemberRouter };