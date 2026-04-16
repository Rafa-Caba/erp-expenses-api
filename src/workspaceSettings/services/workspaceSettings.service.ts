// src/workspaceSettings/services/workspaceSettings.service.ts

import { Types } from "mongoose";

import type { ThemeKey } from "@/src/themes/types/theme.types";

import {
    WorkspaceSettingsModel,
    type WorkspaceSettingsDocument,
} from "../models/WorkspaceSettings.model";
import type {
    UpdateWorkspaceSettingsServiceInput,
    WorkspaceSettingsResponseDto,
} from "../types/workspaceSettings.types";

export class WorkspaceSettingsServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

type CreateDefaultWorkspaceSettingsInput = {
    workspaceId: Types.ObjectId;
    currency?: "MXN" | "USD";
    timezone?: string;
};

function normalizeOptionalTheme(value?: ThemeKey): ThemeKey | undefined {
    if (value === undefined) {
        return undefined;
    }

    return value;
}

function mapWorkspaceSettingsToDto(
    settings: WorkspaceSettingsDocument
): WorkspaceSettingsResponseDto {
    return {
        id: settings._id.toString(),
        workspaceId: settings.workspaceId.toString(),
        defaultCurrency: settings.defaultCurrency,
        language: settings.language,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
        timeFormat: settings.timeFormat,
        theme: settings.theme ?? null,
        notificationsEnabled: settings.notificationsEnabled,
        budgetAlertsEnabled: settings.budgetAlertsEnabled,
        debtAlertsEnabled: settings.debtAlertsEnabled,
        allowMemberEdits: settings.allowMemberEdits,
        weekStartsOn: settings.weekStartsOn ?? null,
        decimalSeparator: settings.decimalSeparator ?? null,
        thousandSeparator: settings.thousandSeparator ?? null,
        isVisible: settings.isVisible ?? true,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
    };
}

export function isWorkspaceSettingsServiceError(
    error: Error
): error is WorkspaceSettingsServiceError {
    return error instanceof WorkspaceSettingsServiceError;
}

export async function getWorkspaceSettingsService(
    workspaceId: Types.ObjectId
): Promise<WorkspaceSettingsResponseDto | null> {
    const settings = await WorkspaceSettingsModel.findOne({ workspaceId });

    if (!settings) {
        return null;
    }

    return mapWorkspaceSettingsToDto(settings);
}

export async function createDefaultWorkspaceSettingsService(
    input: CreateDefaultWorkspaceSettingsInput
): Promise<WorkspaceSettingsResponseDto> {
    const existingSettings = await WorkspaceSettingsModel.findOne({
        workspaceId: input.workspaceId,
    }).select("_id");

    if (existingSettings) {
        throw new WorkspaceSettingsServiceError(
            "Ya existen settings para este workspace.",
            409,
            "WORKSPACE_SETTINGS_ALREADY_EXISTS"
        );
    }

    const settings = await WorkspaceSettingsModel.create({
        workspaceId: input.workspaceId,
        defaultCurrency: input.currency ?? "MXN",
        language: "es-MX",
        timezone: input.timezone?.trim() || "America/Mexico_City",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24h",
        theme: "dark",
        notificationsEnabled: true,
        budgetAlertsEnabled: true,
        debtAlertsEnabled: true,
        allowMemberEdits: false,
        weekStartsOn: 1,
        decimalSeparator: ".",
        thousandSeparator: ",",
        isVisible: true,
    });

    return mapWorkspaceSettingsToDto(settings);
}

export async function updateWorkspaceSettingsService(
    input: UpdateWorkspaceSettingsServiceInput
): Promise<WorkspaceSettingsResponseDto | null> {
    const settings = await WorkspaceSettingsModel.findOne({
        workspaceId: input.workspaceId,
    });

    if (!settings) {
        return null;
    }

    if (input.body.defaultCurrency !== undefined) {
        settings.defaultCurrency = input.body.defaultCurrency;
    }

    if (input.body.language !== undefined) {
        settings.language = input.body.language;
    }

    if (input.body.timezone !== undefined) {
        settings.timezone = input.body.timezone.trim();
    }

    if (input.body.dateFormat !== undefined) {
        settings.dateFormat = input.body.dateFormat;
    }

    if (input.body.timeFormat !== undefined) {
        settings.timeFormat = input.body.timeFormat;
    }

    if (input.body.theme !== undefined) {
        settings.theme = normalizeOptionalTheme(input.body.theme) ?? "dark";
    }

    if (input.body.notificationsEnabled !== undefined) {
        settings.notificationsEnabled = input.body.notificationsEnabled;
    }

    if (input.body.budgetAlertsEnabled !== undefined) {
        settings.budgetAlertsEnabled = input.body.budgetAlertsEnabled;
    }

    if (input.body.debtAlertsEnabled !== undefined) {
        settings.debtAlertsEnabled = input.body.debtAlertsEnabled;
    }

    if (input.body.allowMemberEdits !== undefined) {
        settings.allowMemberEdits = input.body.allowMemberEdits;
    }

    if (input.body.weekStartsOn !== undefined) {
        settings.weekStartsOn = input.body.weekStartsOn;
    }

    if (input.body.decimalSeparator !== undefined) {
        settings.decimalSeparator = input.body.decimalSeparator;
    }

    if (input.body.thousandSeparator !== undefined) {
        settings.thousandSeparator = input.body.thousandSeparator;
    }

    if (input.body.isVisible !== undefined) {
        settings.isVisible = input.body.isVisible;
    }

    await settings.save();

    return mapWorkspaceSettingsToDto(settings);
}