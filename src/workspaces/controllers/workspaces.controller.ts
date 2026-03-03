// src/workspaces/controllers/workspaces.controller.ts

import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import {
  CreateWorkspaceSchema,
  AddMemberByEmailSchema,
  UpdateMemberRoleSchema,
} from "@/src/workspaces/schemas/workspace.schemas";
import {
  createWorkspace,
  listMyWorkspaces,
  getWorkspace,
  listMembers,
  addMemberByEmail,
  updateMemberRole,
  disableMember,
} from "@/src/workspaces/services/workspaces.service";

export async function handleCreateWorkspace(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const parsed = CreateWorkspaceSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ message: "Invalid body", issues: parsed.error.issues });

    const workspace = await createWorkspace({
      userId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      currencyDefault: parsed.data.currencyDefault,
      timezone: parsed.data.timezone,
    });

    return res.status(201).json(workspace.toJSON());
  } catch (err) {
    return next(err);
  }
}

export async function handleListMyWorkspaces(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const list = await listMyWorkspaces(userId);
    return res.json(list);
  } catch (err) {
    return next(err);
  }
}

export async function handleGetWorkspace(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const workspaceId = String(req.params.workspaceId ?? "");
    if (!mongoose.isValidObjectId(workspaceId)) {
      return res.status(400).json({ message: "Invalid workspaceId" });
    }

    const workspace = await getWorkspace(workspaceId);
    if (!workspace)
      return res.status(404).json({ message: "Workspace not found" });

    // Access is already validated by middleware
    return res.json(workspace.toJSON());
  } catch (err) {
    return next(err);
  }
}

export async function handleListMembers(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const workspaceId = String(req.params.workspaceId ?? "");
    if (!mongoose.isValidObjectId(workspaceId)) {
      return res.status(400).json({ message: "Invalid workspaceId" });
    }

    const members = await listMembers(workspaceId);
    return res.json(members.map((m) => m.toJSON()));
  } catch (err) {
    return next(err);
  }
}

export async function handleAddMemberByEmail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const actorUserId = req.user?.id;
    if (!actorUserId) return res.status(401).json({ message: "Unauthorized" });

    const workspaceId = String(req.params.workspaceId ?? "");
    if (!mongoose.isValidObjectId(workspaceId)) {
      return res.status(400).json({ message: "Invalid workspaceId" });
    }

    const parsed = AddMemberByEmailSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ message: "Invalid body", issues: parsed.error.issues });

    const created = await addMemberByEmail({
      workspaceId,
      actorUserId,
      role: parsed.data.role,
      email: parsed.data.email,
    });

    return res.status(201).json(created.toJSON());
  } catch (err: any) {
    const status = Number(err?.status ?? 500);
    if (status !== 500)
      return res.status(status).json({ message: err.message });
    return next(err);
  }
}

export async function handleUpdateMemberRole(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const actorUserId = req.user?.id;
    if (!actorUserId) return res.status(401).json({ message: "Unauthorized" });

    const workspaceId = String(req.params.workspaceId ?? "");
    const memberId = String(req.params.memberId ?? "");

    if (
      !mongoose.isValidObjectId(workspaceId) ||
      !mongoose.isValidObjectId(memberId)
    ) {
      return res.status(400).json({ message: "Invalid ids" });
    }

    const parsed = UpdateMemberRoleSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ message: "Invalid body", issues: parsed.error.issues });

    const updated = await updateMemberRole({
      workspaceId,
      memberId,
      actorUserId,
      role: parsed.data.role,
    });

    return res.json(updated.toJSON());
  } catch (err: any) {
    const status = Number(err?.status ?? 500);
    if (status !== 500)
      return res.status(status).json({ message: err.message });
    return next(err);
  }
}

export async function handleDisableMember(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const actorUserId = req.user?.id;
    if (!actorUserId) return res.status(401).json({ message: "Unauthorized" });

    const workspaceId = String(req.params.workspaceId ?? "");
    const memberId = String(req.params.memberId ?? "");

    if (
      !mongoose.isValidObjectId(workspaceId) ||
      !mongoose.isValidObjectId(memberId)
    ) {
      return res.status(400).json({ message: "Invalid ids" });
    }

    const updated = await disableMember({ workspaceId, memberId, actorUserId });

    return res.json(updated.toJSON());
  } catch (err: any) {
    const status = Number(err?.status ?? 500);
    if (status !== 500)
      return res.status(status).json({ message: err.message });
    return next(err);
  }
}
