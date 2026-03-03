// src/middlewares/requireWorkspaceAccess.ts

import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

import { WorkspaceModel } from "@/src/workspaces/models/Workspace.model";
import { WorkspaceMemberModel } from "@/src/workspaces/models/WorkspaceMember.model";

export function requireWorkspaceAccess(paramName: string = "workspaceId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const workspaceId = String((req.params as any)[paramName] ?? "");
      if (!mongoose.isValidObjectId(workspaceId)) {
        return res.status(400).json({ message: "Invalid workspaceId" });
      }

      const workspace = await WorkspaceModel.findById(workspaceId);
      if (!workspace || !workspace.isActive) {
        return res.status(404).json({ message: "Workspace not found" });
      }

      const member = await WorkspaceMemberModel.findOne({
        workspaceId: workspace._id,
        userId,
        status: "active",
      });

      if (!member) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // INDIVIDUAL guardrail: only owner should exist (enforce at service-level too)
      if (workspace.kind === "INDIVIDUAL" && member.role !== "OWNER") {
        return res.status(403).json({ message: "Forbidden" });
      }

      req.workspace = workspace;
      req.workspaceMember = member;

      return next();
    } catch (err) {
      return next(err);
    }
  };
}
