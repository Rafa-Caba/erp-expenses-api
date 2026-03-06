// src/workspaceSettings/models/WorkspaceSettings.model.ts

import { Schema, model, type Model, type Types } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";
import type {
    WorkspaceDateFormat,
    WorkspaceDecimalSeparator,
    WorkspaceLanguage,
    WorkspaceThousandSeparator,
    WorkspaceTimeFormat,
    WorkspaceWeekStartsOn,
} from "../types/workspaceSettings.types";

export interface WorkspaceSettingsDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    defaultCurrency: CurrencyCode;
    language: WorkspaceLanguage;
    timezone: string;
    dateFormat: WorkspaceDateFormat;
    timeFormat: WorkspaceTimeFormat;
    theme?: string | null;
    notificationsEnabled: boolean;
    budgetAlertsEnabled: boolean;
    debtAlertsEnabled: boolean;
    allowMemberEdits: boolean;
    weekStartsOn?: WorkspaceWeekStartsOn | null;
    decimalSeparator?: WorkspaceDecimalSeparator | null;
    thousandSeparator?: WorkspaceThousandSeparator | null;
    isVisible?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const workspaceSettingsSchema = new Schema<WorkspaceSettingsDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            unique: true,
            index: true,
        },
        defaultCurrency: {
            type: String,
            enum: ["MXN", "USD"],
            required: true,
            trim: true,
            default: "MXN",
        },
        language: {
            type: String,
            enum: ["es-MX", "en-US"],
            required: true,
            trim: true,
            default: "es-MX",
        },
        timezone: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
            default: "America/Mexico_City",
        },
        dateFormat: {
            type: String,
            enum: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"],
            required: true,
            trim: true,
            default: "DD/MM/YYYY",
        },
        timeFormat: {
            type: String,
            enum: ["12h", "24h"],
            required: true,
            trim: true,
            default: "24h",
        },
        theme: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },
        notificationsEnabled: {
            type: Boolean,
            required: true,
            default: true,
        },
        budgetAlertsEnabled: {
            type: Boolean,
            required: true,
            default: true,
        },
        debtAlertsEnabled: {
            type: Boolean,
            required: true,
            default: true,
        },
        allowMemberEdits: {
            type: Boolean,
            required: true,
            default: false,
        },
        weekStartsOn: {
            type: Number,
            enum: [0, 1, 2, 3, 4, 5, 6],
            default: 1,
        },
        decimalSeparator: {
            type: String,
            enum: [".", ","],
            default: ".",
        },
        thousandSeparator: {
            type: String,
            enum: [",", ".", " "],
            default: ",",
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

workspaceSettingsSchema.index({ workspaceId: 1 }, { unique: true });
workspaceSettingsSchema.index({ isVisible: 1 });

export type WorkspaceSettingsModelType = Model<WorkspaceSettingsDocument>;

export const WorkspaceSettingsModel = model<
    WorkspaceSettingsDocument,
    WorkspaceSettingsModelType
>("WorkspaceSettings", workspaceSettingsSchema);