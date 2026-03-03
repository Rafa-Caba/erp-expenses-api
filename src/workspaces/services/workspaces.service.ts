// src/workspaces/services/workspaces.service.ts

import mongoose from "mongoose";

import { WorkspaceModel } from "@/src/workspaces/models/Workspace.model";
import { WorkspaceMemberModel } from "@/src/workspaces/models/WorkspaceMember.model";
import { UserModel } from "@/src/users/models/User.model";

import type { MemberRole } from "@/src/shared/types/common";

type CreateWorkspaceInput = {
  userId: string;
  name: string;
  kind: "SHARED" | "INDIVIDUAL";
  currencyDefault: "MXN" | "USD";
  timezone: string;
};

export async function createWorkspace(input: CreateWorkspaceInput) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const workspace = await WorkspaceModel.create(
      [
        {
          name: input.name,
          kind: input.kind,
          currencyDefault: input.currencyDefault,
          timezone: input.timezone,
          createdByUserId: input.userId,
          updatedByUserId: null,
          isActive: true,
        },
      ],
      { session }
    );

    const created = workspace[0];

    await WorkspaceMemberModel.create(
      [
        {
          workspaceId: created._id,
          userId: input.userId,
          role: "OWNER",
          status: "active",
          createdByUserId: input.userId,
          updatedByUserId: null,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return created;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function listMyWorkspaces(userId: string) {
  const memberships = await WorkspaceMemberModel.find({
    userId,
    status: "active",
  }).select("workspaceId role");
  const workspaceIds = memberships.map((m) => m.workspaceId);

  const workspaces = await WorkspaceModel.find({
    _id: { $in: workspaceIds },
    isActive: true,
  }).sort({ createdAt: -1 });

  const roleByWorkspaceId = new Map<string, string>();
  for (const m of memberships) {
    roleByWorkspaceId.set(String(m.workspaceId), m.role);
  }

  return workspaces.map((w) => ({
    ...w.toJSON(),
    myRole: roleByWorkspaceId.get(String((w as any)._id ?? w.id)) ?? null,
  }));
}

export async function getWorkspace(workspaceId: string) {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace || !workspace.isActive) return null;
  return workspace;
}

export async function listMembers(workspaceId: string) {
  const members = await WorkspaceMemberModel.find({ workspaceId }).sort({
    createdAt: 1,
  });
  return members;
}

export async function addMemberByEmail(params: {
  workspaceId: string;
  actorUserId: string;
  role: MemberRole;
  email: string;
}) {
  const workspace = await WorkspaceModel.findById(params.workspaceId);
  if (!workspace || !workspace.isActive) {
    const e = new Error("Workspace not found");
    (e as any).status = 404;
    throw e;
  }

  if (workspace.kind !== "SHARED") {
    const e = new Error("Cannot add members to an INDIVIDUAL workspace");
    (e as any).status = 400;
    throw e;
  }

  const user = await UserModel.findOne({
    email: params.email.toLowerCase().trim(),
  });
  if (!user) {
    const e = new Error("User not found");
    (e as any).status = 404;
    throw e;
  }

  // Upsert membership (if exists, re-activate and update role)
  const existing = await WorkspaceMemberModel.findOne({
    workspaceId: params.workspaceId,
    userId: user._id,
  });

  if (!existing) {
    const created = await WorkspaceMemberModel.create({
      workspaceId: params.workspaceId,
      userId: user._id,
      role: params.role,
      status: "active",
      createdByUserId: params.actorUserId,
      updatedByUserId: null,
    });
    return created;
  }

  existing.role = params.role;
  existing.status = "active";
  existing.updatedByUserId = new mongoose.Types.ObjectId(params.actorUserId);
  await existing.save();

  return existing;
}

export async function updateMemberRole(params: {
  workspaceId: string;
  memberId: string;
  actorUserId: string;
  role: MemberRole;
}) {
  const member = await WorkspaceMemberModel.findOne({
    _id: params.memberId,
    workspaceId: params.workspaceId,
  });
  if (!member) {
    const e = new Error("Member not found");
    (e as any).status = 404;
    throw e;
  }

  // Prevent removing ownership by accident (service-level guard)
  if (member.role === "OWNER" && params.role !== "OWNER") {
    const e = new Error("Cannot change OWNER role");
    (e as any).status = 400;
    throw e;
  }

  member.role = params.role;
  member.updatedByUserId = new mongoose.Types.ObjectId(params.actorUserId);
  await member.save();

  return member;
}

export async function disableMember(params: {
  workspaceId: string;
  memberId: string;
  actorUserId: string;
}) {
  const member = await WorkspaceMemberModel.findOne({
    _id: params.memberId,
    workspaceId: params.workspaceId,
  });
  if (!member) {
    const e = new Error("Member not found");
    (e as any).status = 404;
    throw e;
  }

  if (member.role === "OWNER") {
    const e = new Error("Cannot disable OWNER");
    (e as any).status = 400;
    throw e;
  }

  member.status = "disabled";
  member.updatedByUserId = new mongoose.Types.ObjectId(params.actorUserId);
  await member.save();

  return member;
}
