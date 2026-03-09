import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";
import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";

export const SAVINGS_GOAL_STATUS_VALUES = [
    "active",
    "completed",
    "paused",
    "cancelled",
] as const;

export type SavingsGoalStatus = (typeof SAVINGS_GOAL_STATUS_VALUES)[number];

export const SAVINGS_GOAL_PRIORITY_VALUES = [
    "low",
    "medium",
    "high",
] as const;

export type SavingsGoalPriority = (typeof SAVINGS_GOAL_PRIORITY_VALUES)[number];

export const SAVINGS_GOAL_CATEGORY_VALUES = [
    "emergency_fund",
    "vacation",
    "education",
    "home",
    "car",
    "business",
    "retirement",
    "custom",
] as const;

export type SavingsGoalCategory = (typeof SAVINGS_GOAL_CATEGORY_VALUES)[number];

export interface SavingsGoalDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    accountId?: Types.ObjectId | null;
    memberId?: Types.ObjectId | null;
    name: string;
    description?: string | null;
    targetAmount: number;
    currentAmount: number;
    currency: CurrencyCode;
    targetDate?: Date | null;
    status: SavingsGoalStatus;
    priority?: SavingsGoalPriority | null;
    category: SavingsGoalCategory;
    isVisible?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkspaceSavingsGoalParams extends ParamsDictionary {
    workspaceId: string;
}

export interface SavingsGoalParams extends ParamsDictionary {
    workspaceId: string;
    savingsGoalId: string;
}

export interface CreateSavingsGoalBody {
    accountId?: string | null;
    memberId?: string | null;
    name: string;
    description?: string | null;
    targetAmount: number;
    currentAmount: number;
    currency: CurrencyCode;
    targetDate?: string | null;
    status?: SavingsGoalStatus;
    priority?: SavingsGoalPriority | null;
    category?: SavingsGoalCategory;
    isVisible?: boolean;
}

export interface UpdateSavingsGoalBody {
    accountId?: string | null;
    memberId?: string | null;
    name?: string;
    description?: string | null;
    targetAmount?: number;
    currentAmount?: number;
    currency?: CurrencyCode;
    targetDate?: string | null;
    status?: SavingsGoalStatus;
    priority?: SavingsGoalPriority | null;
    category?: SavingsGoalCategory;
    isVisible?: boolean;
}

export interface CreateSavingsGoalServiceInput {
    workspaceId: Types.ObjectId;
    body: CreateSavingsGoalBody;
    workspace: WorkspaceDocument;
}

export interface UpdateSavingsGoalServiceInput {
    workspaceId: Types.ObjectId;
    savingsGoalId: Types.ObjectId;
    body: UpdateSavingsGoalBody;
    workspace: WorkspaceDocument;
}

export interface DeleteSavingsGoalServiceInput {
    workspaceId: Types.ObjectId;
    savingsGoalId: Types.ObjectId;
    workspace: WorkspaceDocument;
}