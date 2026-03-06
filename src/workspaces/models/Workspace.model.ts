// src/workspaces/models/Workspace.model.ts

import { Schema, model, type Model, type Types } from "mongoose";

import type {
    CurrencyCode,
    WorkspaceKind,
    WorkspaceType,
    WorkspaceVisibility,
} from "@/src/shared/types/common";

export interface WorkspaceDocument {
    _id: Types.ObjectId;
    type: WorkspaceType;
    kind: WorkspaceKind;
    name: string;
    description?: string | null;
    ownerUserId: Types.ObjectId;
    currency: CurrencyCode;
    timezone: string;
    country?: string | null;
    icon?: string | null;
    color?: string | null;
    visibility: WorkspaceVisibility;
    isActive: boolean;
    isArchived?: boolean;
    isVisible?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const workspaceSchema = new Schema<WorkspaceDocument>(
    {
        type: {
            type: String,
            enum: ["PERSONAL", "HOUSEHOLD", "BUSINESS"],
            required: true,
            trim: true,
        },
        kind: {
            type: String,
            enum: ["INDIVIDUAL", "COLLABORATIVE"],
            required: true,
            default: "INDIVIDUAL",
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },
        ownerUserId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        currency: {
            type: String,
            enum: ["MXN", "USD"],
            required: true,
            trim: true,
        },
        timezone: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        country: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },
        icon: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },
        color: {
            type: String,
            trim: true,
            maxlength: 30,
            default: null,
        },
        visibility: {
            type: String,
            enum: ["PRIVATE", "SHARED"],
            required: true,
            default: "PRIVATE",
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            required: true,
        },
        isArchived: {
            type: Boolean,
            default: false,
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

workspaceSchema.index({ ownerUserId: 1, isActive: 1 });
workspaceSchema.index({ ownerUserId: 1, type: 1 });
workspaceSchema.index({ ownerUserId: 1, kind: 1 });
workspaceSchema.index({ ownerUserId: 1, visibility: 1 });
workspaceSchema.index({ isArchived: 1 });

export type WorkspaceModelType = Model<WorkspaceDocument>;

export const WorkspaceModel = model<WorkspaceDocument, WorkspaceModelType>(
    "Workspace",
    workspaceSchema
);