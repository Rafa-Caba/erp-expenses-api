// src/themes/services/theme.service.ts

import { Types } from "mongoose";

import { ThemeModel, type ThemeDocument } from "../models/Theme.model";
import type {
    CreateThemeServiceInput,
    ThemeColors,
    ThemeKey,
    ThemeResponseDto,
    UpdateThemeServiceInput,
} from "../types/theme.types";

export class ThemeServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

function normalizeOptionalString(value?: string | null): string | null | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
}

function mapThemeToDto(theme: ThemeDocument): ThemeResponseDto {
    return {
        id: theme._id.toString(),
        workspaceId: theme.workspaceId.toString(),
        key: theme.key,
        name: theme.name,
        description: theme.description ?? null,
        mode: theme.mode,
        isBuiltIn: theme.isBuiltIn,
        isEditable: theme.isEditable,
        isActive: theme.isActive,
        colors: {
            background: theme.colors.background,
            surface: theme.colors.surface,
            surfaceAlt: theme.colors.surfaceAlt,
            textPrimary: theme.colors.textPrimary,
            textSecondary: theme.colors.textSecondary,
            primary: theme.colors.primary,
            secondary: theme.colors.secondary,
            success: theme.colors.success,
            warning: theme.colors.warning,
            error: theme.colors.error,
            info: theme.colors.info,
            divider: theme.colors.divider,
        },
        createdAt: theme.createdAt,
        updatedAt: theme.updatedAt,
    };
}

function getDefaultThemeColors(key: ThemeKey): ThemeColors {
    if (key === "light") {
        return {
            background: "#F8FAFC",
            surface: "#FFFFFF",
            surfaceAlt: "#F1F5F9",
            textPrimary: "#0F172A",
            textSecondary: "#475569",
            primary: "#2563EB",
            secondary: "#7C3AED",
            success: "#16A34A",
            warning: "#D97706",
            error: "#DC2626",
            info: "#0891B2",
            divider: "#E2E8F0",
        };
    }

    if (key === "customizable") {
        return {
            background: "#0B1220",
            surface: "#111827",
            surfaceAlt: "#1F2937",
            textPrimary: "#F9FAFB",
            textSecondary: "#CBD5E1",
            primary: "#3B82F6",
            secondary: "#8B5CF6",
            success: "#22C55E",
            warning: "#F59E0B",
            error: "#EF4444",
            info: "#06B6D4",
            divider: "#334155",
        };
    }

    return {
        background: "#000000",
        surface: "#0A0A0A",
        surfaceAlt: "#141414",
        textPrimary: "#F5F5F5",
        textSecondary: "#A3A3A3",
        primary: "#3B82F6",
        secondary: "#8B5CF6",
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#06B6D4",
        divider: "#262626",
    };
}

function getDefaultThemeDefinition(key: ThemeKey): Omit<CreateThemeServiceInput, "workspaceId"> {
    if (key === "light") {
        return {
            key: "light",
            name: "Light",
            description: "Tema claro base del sistema.",
            mode: "light",
            isBuiltIn: true,
            isEditable: false,
            isActive: true,
            colors: getDefaultThemeColors("light"),
        };
    }

    if (key === "customizable") {
        return {
            key: "customizable",
            name: "Personalizable",
            description: "Tema editable del workspace.",
            mode: "dark",
            isBuiltIn: true,
            isEditable: true,
            isActive: true,
            colors: getDefaultThemeColors("customizable"),
        };
    }

    return {
        key: "dark",
        name: "Dark",
        description: "Tema oscuro base del sistema.",
        mode: "dark",
        isBuiltIn: true,
        isEditable: false,
        isActive: true,
        colors: getDefaultThemeColors("dark"),
    };
}

export function isThemeServiceError(error: Error): error is ThemeServiceError {
    return error instanceof ThemeServiceError;
}

export async function listThemesByWorkspaceService(
    workspaceId: Types.ObjectId
): Promise<ThemeResponseDto[]> {
    const themes = await ThemeModel.find({
        workspaceId,
        isActive: true,
    }).sort({ createdAt: 1 });

    return themes.map(mapThemeToDto);
}

export async function getThemeByKeyService(
    workspaceId: Types.ObjectId,
    themeKey: ThemeKey
): Promise<ThemeResponseDto | null> {
    const theme = await ThemeModel.findOne({
        workspaceId,
        key: themeKey,
        isActive: true,
    });

    if (!theme) {
        return null;
    }

    return mapThemeToDto(theme);
}

export async function createThemeService(
    input: CreateThemeServiceInput
): Promise<ThemeResponseDto> {
    const existingTheme = await ThemeModel.findOne({
        workspaceId: input.workspaceId,
        key: input.key,
    }).select("_id");

    if (existingTheme) {
        throw new ThemeServiceError(
            "Ya existe un tema con esa key en este workspace.",
            409,
            "THEME_ALREADY_EXISTS"
        );
    }

    const theme = await ThemeModel.create({
        workspaceId: input.workspaceId,
        key: input.key,
        name: input.name.trim(),
        description: normalizeOptionalString(input.description) ?? null,
        mode: input.mode,
        isBuiltIn: input.isBuiltIn,
        isEditable: input.isEditable,
        isActive: input.isActive ?? true,
        colors: input.colors,
    });

    return mapThemeToDto(theme);
}

export async function ensureDefaultThemesForWorkspaceService(
    workspaceId: Types.ObjectId
): Promise<ThemeResponseDto[]> {
    const themeKeys: ThemeKey[] = ["dark", "light", "customizable"];
    const ensuredThemes: ThemeResponseDto[] = [];

    for (const themeKey of themeKeys) {
        const existingTheme = await ThemeModel.findOne({
            workspaceId,
            key: themeKey,
        });

        if (existingTheme) {
            ensuredThemes.push(mapThemeToDto(existingTheme));
            continue;
        }

        const defaultTheme = getDefaultThemeDefinition(themeKey);

        const createdTheme = await ThemeModel.create({
            workspaceId,
            key: defaultTheme.key,
            name: defaultTheme.name,
            description: defaultTheme.description ?? null,
            mode: defaultTheme.mode,
            isBuiltIn: defaultTheme.isBuiltIn,
            isEditable: defaultTheme.isEditable,
            isActive: defaultTheme.isActive,
            colors: defaultTheme.colors,
        });

        ensuredThemes.push(mapThemeToDto(createdTheme));
    }

    return ensuredThemes.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
}

export async function updateThemeService(
    input: UpdateThemeServiceInput
): Promise<ThemeResponseDto | null> {
    const theme = await ThemeModel.findOne({
        workspaceId: input.workspaceId,
        key: input.themeKey,
        isActive: true,
    });

    if (!theme) {
        return null;
    }

    if (!theme.isEditable || theme.key !== "customizable") {
        throw new ThemeServiceError(
            "Solo el tema personalizable puede editarse.",
            400,
            "THEME_NOT_EDITABLE"
        );
    }

    if (input.body.name !== undefined) {
        theme.name = input.body.name.trim();
    }

    if (input.body.description !== undefined) {
        theme.description = normalizeOptionalString(input.body.description) ?? null;
    }

    if (input.body.isActive !== undefined) {
        theme.isActive = input.body.isActive;
    }

    if (input.body.colors) {
        theme.colors = {
            background: input.body.colors.background ?? theme.colors.background,
            surface: input.body.colors.surface ?? theme.colors.surface,
            surfaceAlt: input.body.colors.surfaceAlt ?? theme.colors.surfaceAlt,
            textPrimary: input.body.colors.textPrimary ?? theme.colors.textPrimary,
            textSecondary: input.body.colors.textSecondary ?? theme.colors.textSecondary,
            primary: input.body.colors.primary ?? theme.colors.primary,
            secondary: input.body.colors.secondary ?? theme.colors.secondary,
            success: input.body.colors.success ?? theme.colors.success,
            warning: input.body.colors.warning ?? theme.colors.warning,
            error: input.body.colors.error ?? theme.colors.error,
            info: input.body.colors.info ?? theme.colors.info,
            divider: input.body.colors.divider ?? theme.colors.divider,
        };
    }

    await theme.save();

    return mapThemeToDto(theme);
}