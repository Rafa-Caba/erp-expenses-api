// src/types/express.d.ts

import "express";

export type WorkspaceKind = "INDIVIDUAL" | "SHARED";
export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      email?: string;
    };

    workspaceAccess?: {
      workspaceId: string;
      workspaceKind: WorkspaceKind;
      role: WorkspaceRole;
    };
  }
}