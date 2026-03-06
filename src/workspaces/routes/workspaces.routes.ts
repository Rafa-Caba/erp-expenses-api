// src/workspaces/routes/workspaces.routes.ts

import { Router } from "express";

import {
    archiveWorkspaceController,
    createWorkspaceController,
    getWorkspaceByIdController,
    getWorkspacesController,
    updateWorkspaceController,
} from "../controllers/workspaces.controller";
import {
    createWorkspaceSchema,
    updateWorkspaceSchema,
    workspaceParamsSchema,
} from "../schemas/workspace.schemas";
import type {
    UpdateWorkspaceBody,
    WorkspaceParams,
} from "../types/workspace.types";
import { workspaceMemberRouter } from "./workspaceMember.routes";
import { validateRequest } from "@/src/middlewares/validateRequest";
import { verifyToken } from "@/src/middlewares/verifyToken";

const workspacesRouter = Router();

workspacesRouter.use(verifyToken);

workspacesRouter.use("/:workspaceId/members", workspaceMemberRouter);

workspacesRouter.get("/", getWorkspacesController);

workspacesRouter.get<WorkspaceParams>(
    "/:workspaceId",
    validateRequest(workspaceParamsSchema),
    getWorkspaceByIdController
);

workspacesRouter.post(
    "/",
    validateRequest(createWorkspaceSchema),
    createWorkspaceController
);

workspacesRouter.patch<WorkspaceParams, object, UpdateWorkspaceBody>(
    "/:workspaceId",
    validateRequest(workspaceParamsSchema),
    validateRequest(updateWorkspaceSchema),
    updateWorkspaceController
);

workspacesRouter.delete<WorkspaceParams>(
    "/:workspaceId",
    validateRequest(workspaceParamsSchema),
    archiveWorkspaceController
);

export { workspacesRouter };