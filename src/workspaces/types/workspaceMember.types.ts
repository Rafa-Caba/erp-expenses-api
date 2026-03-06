// src/workspaces/types/workspaceMember.types.ts

import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { MemberRole, MemberStatus } from "@/src/shared/types/common";
import type { WorkspacePermission } from "@/src/shared/types/workspacePermissions";

export interface WorkspaceMemberParams extends ParamsDictionary {
    workspaceId: string;
}

export interface WorkspaceMemberByIdParams extends ParamsDictionary {
    workspaceId: string;
    memberId: string;
}

export interface CreateWorkspaceMemberBody {
    userId: string;
    displayName: string;
    role: MemberRole;
    permissions?: WorkspacePermission[];
    status?: MemberStatus;
    joinedAt?: string;
    notes?: string;
    isVisible?: boolean;
}

export interface UpdateWorkspaceMemberBody {
    displayName?: string;
    role?: MemberRole;
    permissions?: WorkspacePermission[];
    notes?: string;
    isVisible?: boolean;
}

export interface UpdateWorkspaceMemberStatusBody {
    status: MemberStatus;
    joinedAt?: string;
}

export interface WorkspaceMemberResponseDto {
    id: string;
    workspaceId: string;
    userId: string;
    displayName: string;
    role: MemberRole;
    permissions: WorkspacePermission[];
    status: MemberStatus;
    joinedAt: Date | null;
    invitedByUserId: string | null;
    notes: string | null;
    isVisible: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateWorkspaceMemberServiceInput {
    workspaceId: Types.ObjectId;
    invitedByUserId: Types.ObjectId;
    actorRole: MemberRole;
    body: CreateWorkspaceMemberBody;
}

export interface UpdateWorkspaceMemberServiceInput {
    workspaceId: Types.ObjectId;
    actorRole: MemberRole;
    memberId: Types.ObjectId;
    body: UpdateWorkspaceMemberBody;
}

export interface UpdateWorkspaceMemberStatusServiceInput {
    workspaceId: Types.ObjectId;
    actorRole: MemberRole;
    memberId: Types.ObjectId;
    body: UpdateWorkspaceMemberStatusBody;
}

export interface DeleteWorkspaceMemberServiceInput {
    workspaceId: Types.ObjectId;
    actorRole: MemberRole;
    memberId: Types.ObjectId;
}