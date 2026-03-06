// src/workspaces/routes/workspaces.routes.ts

import { Router } from "express";

import { requireAuth } from "@/src/middlewares/requireAuth";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireRole } from "@/src/middlewares/requireRole";

import {
  handleCreateWorkspace,
  handleListMyWorkspaces,
  handleGetWorkspace,
  handleListMembers,
  handleAddMemberByEmail,
  handleUpdateMemberRole,
  handleDisableMember,
} from "@/src/workspaces/controllers/workspaces.controller";
import { debtsRouter } from "@/src/debts/routes/debts.routes";
import { scheduledRouter } from "@/src/scheduled/routes/scheduled.routes";

export const workspacesRouter = Router();

// All routes require auth
workspacesRouter.use(requireAuth);

// My workspaces
workspacesRouter.get("/", handleListMyWorkspaces);

// Create workspace
workspacesRouter.post("/", handleCreateWorkspace);

// Workspace detail (must be member)
workspacesRouter.get(
  "/:workspaceId",
  requireWorkspaceAccess("workspaceId"),
  handleGetWorkspace
);

// Members
workspacesRouter.get(
  "/:workspaceId/members",
  requireWorkspaceAccess("workspaceId"),
  handleListMembers
);

// Add member (SHARED only at service-level), only OWNER/ADMIN
workspacesRouter.post(
  "/:workspaceId/members",
  requireWorkspaceAccess("workspaceId"),
  requireRole("OWNER", "ADMIN"),
  handleAddMemberByEmail
);

// Update member role (OWNER/ADMIN)
workspacesRouter.patch(
  "/:workspaceId/members/:memberId/role",
  requireWorkspaceAccess("workspaceId"),
  requireRole("OWNER", "ADMIN"),
  handleUpdateMemberRole
);

// Disable member (OWNER/ADMIN)
workspacesRouter.patch(
  "/:workspaceId/members/:memberId/disable",
  requireWorkspaceAccess("workspaceId"),
  requireRole("OWNER", "ADMIN"),
  handleDisableMember
);

// Debts Module
workspacesRouter.use("/:workspaceId/debts", debtsRouter);

// Scheduled Module
workspacesRouter.use("/:workspaceId/scheduled", scheduledRouter);