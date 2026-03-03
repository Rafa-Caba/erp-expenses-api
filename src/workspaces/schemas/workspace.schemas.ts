// src/workspaces/schemas/workspace.schemas.ts

import { z } from "zod";

export const WorkspaceKindSchema = z.enum(["SHARED", "INDIVIDUAL"]);
export const MemberRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]);

export const CreateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  kind: WorkspaceKindSchema,
  currencyDefault: z.enum(["MXN", "USD"]).default("MXN"),
  timezone: z.string().trim().min(3).max(64).default("America/Mexico_City"),
});

export const UpdateMemberRoleSchema = z.object({
  role: MemberRoleSchema,
});

export const AddMemberByEmailSchema = z.object({
  email: z.string().trim().email(),
  role: MemberRoleSchema.default("MEMBER"),
});
