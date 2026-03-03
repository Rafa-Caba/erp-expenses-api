// src/workspaces/types/workspace.types.ts

import type {
  CurrencyCode,
  MemberRole,
  MemberStatus,
  WorkspaceKind,
} from "@/src/shared/types/common";

export interface WorkspaceEntity {
  id: string;
  name: string;
  kind: WorkspaceKind;
  currencyDefault: CurrencyCode;
  timezone: string;

  createdByUserId: string;
  updatedByUserId: string | null;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMemberEntity {
  id: string;
  workspaceId: string;
  userId: string;

  role: MemberRole;
  status: MemberStatus;

  createdByUserId: string;
  updatedByUserId: string | null;

  createdAt: Date;
  updatedAt: Date;
}
