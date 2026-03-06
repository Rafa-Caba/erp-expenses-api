// src/types/express.d.ts

import "express-serve-static-core";

import type { MemberRole, WorkspaceKind } from "@/src/shared/types/common";
import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";
import type { WorkspaceMemberDocument } from "@/src/workspaces/models/WorkspaceMember.model";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      email?: string;
      role?: string;
    };

    workspace?: WorkspaceDocument;
    workspaceMember?: WorkspaceMemberDocument;

    workspaceAccess?: {
      workspaceId: string;
      workspaceKind: WorkspaceKind;
      role: MemberRole;
    };
  }
}