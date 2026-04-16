// src/themes/models/Theme.model.ts

import { Schema, model, type Model, type Types } from "mongoose";

import type { ThemeColors, ThemeKey, ThemeMode } from "../types/theme.types";

export interface ThemeDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    key: ThemeKey;
    name: string;
    description?: string | null;
    mode: ThemeMode;
    isBuiltIn: boolean;
    isEditable: boolean;
    isActive: boolean;
    colors: ThemeColors;
    createdAt: Date;
    updatedAt: Date;
}

const themeColorsSchema = new Schema<ThemeColors>(
    {
        background: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        surface: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        surfaceAlt: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        textPrimary: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        textSecondary: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        primary: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        secondary: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        success: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        warning: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        error: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        info: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        divider: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
    },
    {
        _id: false,
        versionKey: false,
    }
);

const themeSchema = new Schema<ThemeDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        key: {
            type: String,
            enum: ["dark", "light", "customizable"],
            required: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 300,
            default: null,
        },
        mode: {
            type: String,
            enum: ["dark", "light"],
            required: true,
            trim: true,
        },
        isBuiltIn: {
            type: Boolean,
            required: true,
            default: true,
        },
        isEditable: {
            type: Boolean,
            required: true,
            default: false,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
        colors: {
            type: themeColorsSchema,
            required: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

themeSchema.index({ workspaceId: 1, key: 1 }, { unique: true });
themeSchema.index({ workspaceId: 1, isActive: 1 });

export type ThemeModelType = Model<ThemeDocument>;

export const ThemeModel = model<ThemeDocument, ThemeModelType>(
    "Theme",
    themeSchema
);