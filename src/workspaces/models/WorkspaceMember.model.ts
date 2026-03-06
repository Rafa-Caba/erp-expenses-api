// src/workspaces/models/WorkspaceMember.model.ts

import { Schema, model, type Model, type Types } from "mongoose";

import type { MemberRole, MemberStatus } from "@/src/shared/types/common";
import {
    workspacePermissionValues,
    type WorkspacePermission,
} from "@/src/shared/types/workspacePermissions";

export interface WorkspaceMemberDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    displayName: string;
    role: MemberRole;
    permissions?: WorkspacePermission[];
    status: MemberStatus;
    joinedAt?: Date | null;
    invitedByUserId?: Types.ObjectId | null;
    notes?: string | null;
    isVisible?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const workspaceMemberSchema = new Schema<WorkspaceMemberDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        displayName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        role: {
            type: String,
            enum: ["OWNER", "ADMIN", "MEMBER", "VIEWER"],
            required: true,
            trim: true,
        },
        permissions: {
            type: [
                {
                    type: String,
                    enum: workspacePermissionValues,
                },
            ],
            default: [],
        },
        status: {
            type: String,
            enum: ["active", "invited", "disabled"],
            required: true,
            default: "active",
        },
        joinedAt: {
            type: Date,
            default: null,
        },
        invitedByUserId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },
        isVisible: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
workspaceMemberSchema.index({ workspaceId: 1, role: 1 });
workspaceMemberSchema.index({ workspaceId: 1, status: 1 });

export type WorkspaceMemberModelType = Model<WorkspaceMemberDocument>;

export const WorkspaceMemberModel = model<
    WorkspaceMemberDocument,
    WorkspaceMemberModelType
>("WorkspaceMember", workspaceMemberSchema);