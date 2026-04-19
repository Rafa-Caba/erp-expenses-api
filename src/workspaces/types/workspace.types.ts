import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type {
    CurrencyCode,
    WorkspaceKind,
    WorkspaceType,
    WorkspaceVisibility,
    MemberRole,
    MemberStatus,
} from "@/src/shared/types/common";

export interface WorkspaceParams extends ParamsDictionary {
    workspaceId: string;
}

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

export interface WorkspaceCurrentMembershipDto {
    memberId: string;
    role: MemberRole;
    status: MemberStatus;
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
    currentMembership: WorkspaceCurrentMembershipDto | null;
}

export interface WorkspaceListItemDto extends WorkspaceResponseDto {
    memberCount: number;
}

export interface WorkspaceQueryOptions {
    ownerUserId: Types.ObjectId;
    includeArchived?: boolean;
    includeInactive?: boolean;
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