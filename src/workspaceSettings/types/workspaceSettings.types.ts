// src/workspaceSettings/types/workspaceSettings.types.ts

import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";

export type WorkspaceLanguage = "es-MX" | "en-US";

export type WorkspaceDateFormat =
    | "DD/MM/YYYY"
    | "MM/DD/YYYY"
    | "YYYY-MM-DD";

export type WorkspaceTimeFormat = "12h" | "24h";

export type WorkspaceWeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WorkspaceDecimalSeparator = "." | ",";
export type WorkspaceThousandSeparator = "," | "." | " ";

export interface WorkspaceSettingsParams extends ParamsDictionary {
    workspaceId: string;
}

export interface CreateWorkspaceSettingsBody {
    workspaceId: string;
    defaultCurrency: CurrencyCode;
    language: WorkspaceLanguage;
    timezone: string;
    dateFormat: WorkspaceDateFormat;
    timeFormat?: WorkspaceTimeFormat;
    theme?: string;
    notificationsEnabled: boolean;
    budgetAlertsEnabled: boolean;
    debtAlertsEnabled: boolean;
    allowMemberEdits: boolean;
    weekStartsOn?: WorkspaceWeekStartsOn;
    decimalSeparator?: WorkspaceDecimalSeparator;
    thousandSeparator?: WorkspaceThousandSeparator;
    isVisible?: boolean;
}

export interface UpdateWorkspaceSettingsBody {
    defaultCurrency?: CurrencyCode;
    language?: WorkspaceLanguage;
    timezone?: string;
    dateFormat?: WorkspaceDateFormat;
    timeFormat?: WorkspaceTimeFormat;
    theme?: string;
    notificationsEnabled?: boolean;
    budgetAlertsEnabled?: boolean;
    debtAlertsEnabled?: boolean;
    allowMemberEdits?: boolean;
    weekStartsOn?: WorkspaceWeekStartsOn;
    decimalSeparator?: WorkspaceDecimalSeparator;
    thousandSeparator?: WorkspaceThousandSeparator;
    isVisible?: boolean;
}

export interface WorkspaceSettingsResponseDto {
    id: string;
    workspaceId: string;
    defaultCurrency: CurrencyCode;
    language: WorkspaceLanguage;
    timezone: string;
    dateFormat: WorkspaceDateFormat;
    timeFormat: WorkspaceTimeFormat;
    theme: string | null;
    notificationsEnabled: boolean;
    budgetAlertsEnabled: boolean;
    debtAlertsEnabled: boolean;
    allowMemberEdits: boolean;
    weekStartsOn: WorkspaceWeekStartsOn | null;
    decimalSeparator: WorkspaceDecimalSeparator | null;
    thousandSeparator: WorkspaceThousandSeparator | null;
    isVisible: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateWorkspaceSettingsServiceInput {
    workspaceId: Types.ObjectId;
    body: Omit<CreateWorkspaceSettingsBody, "workspaceId">;
}

export interface UpdateWorkspaceSettingsServiceInput {
    workspaceId: Types.ObjectId;
    body: UpdateWorkspaceSettingsBody;
}