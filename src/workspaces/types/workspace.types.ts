// src/workspaces/types/workspace.types.ts

import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type {
    CurrencyCode,
    WorkspaceKind,
    WorkspaceType,
    WorkspaceVisibility,
} from "@/src/shared/types/common";

export interface CreateWorkspaceBody {
    type: WorkspaceType;
    kind?: WorkspaceKind;
    name: string;
    description?: string;
    currency: CurrencyCode;
    timezone: string;
    country?: string;
    icon?: string;
    color?: string;
    visibility?: WorkspaceVisibility;
    isVisible?: boolean;
}

export interface UpdateWorkspaceBody {
    type?: WorkspaceType;
    kind?: WorkspaceKind;
    name?: string;
    description?: string;
    currency?: CurrencyCode;
    timezone?: string;
    country?: string;
    icon?: string;
    color?: string;
    visibility?: WorkspaceVisibility;
    isActive?: boolean;
    isArchived?: boolean;
    isVisible?: boolean;
}

export interface WorkspaceParams extends ParamsDictionary {
    workspaceId: string;
}

export interface WorkspaceResponseDto {
    id: string;
    type: WorkspaceType;
    kind: WorkspaceKind;
    name: string;
    description: string | null;
    ownerUserId: string;
    currency: CurrencyCode;
    timezone: string;
    country: string | null;
    icon: string | null;
    color: string | null;
    visibility: WorkspaceVisibility;
    isActive: boolean;
    isArchived: boolean;
    isVisible: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkspaceListItemDto extends WorkspaceResponseDto {
    memberCount?: number;
}

export interface CreateWorkspaceServiceInput {
    ownerUserId: Types.ObjectId;
    body: CreateWorkspaceBody;
}

export interface UpdateWorkspaceServiceInput {
    workspaceId: Types.ObjectId;
    ownerUserId: Types.ObjectId;
    body: UpdateWorkspaceBody;
}

export interface WorkspaceQueryOptions {
    ownerUserId: Types.ObjectId;
    includeArchived?: boolean;
    includeInactive?: boolean;
}