// src/middlewares/requireWorkspaceAccess.ts

import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";

import { WorkspaceModel } from "@/src/workspaces/models/Workspace.model";
import { WorkspaceMemberModel } from "@/src/workspaces/models/WorkspaceMember.model";

export function requireWorkspaceAccess(paramName: string = "workspaceId") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        });
        return;
      }

      const workspaceId = req.params[paramName];

      if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) {
        res.status(400).json({
          code: "INVALID_WORKSPACE_ID",
          message: "Invalid workspaceId",
        });
        return;
      }

      const workspace = await WorkspaceModel.findById(workspaceId);

      if (!workspace || !workspace.isActive || workspace.isArchived) {
        res.status(404).json({
          code: "WORKSPACE_NOT_FOUND",
          message: "Workspace not found",
        });
        return;
      }

      const member = await WorkspaceMemberModel.findOne({
        workspaceId: workspace._id,
        userId,
        status: "active",
      });

      if (!member) {
        res.status(403).json({
          code: "WORKSPACE_FORBIDDEN",
          message: "Forbidden",
        });
        return;
      }

      if (workspace.kind === "INDIVIDUAL" && member.role !== "OWNER") {
        res.status(403).json({
          code: "WORKSPACE_KIND_FORBIDDEN",
          message: "Forbidden",
        });
        return;
      }

      req.workspace = workspace;
      req.workspaceMember = member;
      req.workspaceAccess = {
        workspaceId: workspace._id.toString(),
        workspaceKind: workspace.kind,
        role: member.role,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}