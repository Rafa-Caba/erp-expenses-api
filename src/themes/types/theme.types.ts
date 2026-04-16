// src/themes/types/theme.types.ts

import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

export type ThemeKey = "dark" | "light" | "customizable";
export type ThemeMode = "dark" | "light";

export interface ThemeColors {
    background: string;
    surface: string;
    surfaceAlt: string;
    textPrimary: string;
    textSecondary: string;
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    divider: string;
}

export interface ThemeParams extends ParamsDictionary {
    workspaceId: string;
}

export interface ThemeByKeyParams extends ParamsDictionary {
    workspaceId: string;
    themeKey: ThemeKey;
}

export interface UpdateThemeBody {
    name?: string;
    description?: string | null;
    colors?: Partial<ThemeColors>;
    isActive?: boolean;
}

export interface ThemeResponseDto {
    id: string;
    workspaceId: string;
    key: ThemeKey;
    name: string;
    description: string | null;
    mode: ThemeMode;
    isBuiltIn: boolean;
    isEditable: boolean;
    isActive: boolean;
    colors: ThemeColors;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateThemeServiceInput {
    workspaceId: Types.ObjectId;
    key: ThemeKey;
    name: string;
    description?: string | null;
    mode: ThemeMode;
    isBuiltIn: boolean;
    isEditable: boolean;
    isActive?: boolean;
    colors: ThemeColors;
}

export interface UpdateThemeServiceInput {
    workspaceId: Types.ObjectId;
    themeKey: ThemeKey;
    body: UpdateThemeBody;
}