import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";
import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";

export const BUDGET_PERIOD_TYPE_VALUES = [
    "weekly",
    "monthly",
    "yearly",
    "custom",
] as const;

export type BudgetPeriodType = (typeof BUDGET_PERIOD_TYPE_VALUES)[number];

export const BUDGET_STATUS_VALUES = [
    "draft",
    "active",
    "completed",
    "exceeded",
    "archived",
] as const;

export type BudgetStatus = (typeof BUDGET_STATUS_VALUES)[number];

export interface BudgetDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    name: string;
    periodType: BudgetPeriodType;
    startDate: Date;
    endDate: Date;
    limitAmount: number;
    currency: CurrencyCode;
    categoryId?: Types.ObjectId | null;
    memberId?: Types.ObjectId | null;
    alertPercent?: number | null;
    notes?: string | null;
    isActive: boolean;
    status: BudgetStatus;
    isVisible?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface BudgetComputedMetrics {
    spentAmount: number;
    remainingAmount: number;
    usagePercent: number;
    hasReachedAlert: boolean;
    isExceeded: boolean;
    matchedTransactionCount: number;
    computedStatus: BudgetStatus;
}

export interface BudgetResponseDto extends BudgetDocument, BudgetComputedMetrics { }

export interface WorkspaceBudgetParams extends ParamsDictionary {
    workspaceId: string;
}

export interface BudgetParams extends ParamsDictionary {
    workspaceId: string;
    budgetId: string;
}

export interface CreateBudgetBody {
    name: string;
    periodType: BudgetPeriodType;
    startDate: string;
    endDate: string;
    limitAmount: number;
    currency: CurrencyCode;
    categoryId?: string | null;
    memberId?: string | null;
    alertPercent?: number | null;
    notes?: string | null;
    isActive?: boolean;
    status?: BudgetStatus;
    isVisible?: boolean;
}

export interface UpdateBudgetBody {
    name?: string;
    periodType?: BudgetPeriodType;
    startDate?: string;
    endDate?: string;
    limitAmount?: number;
    currency?: CurrencyCode;
    categoryId?: string | null;
    memberId?: string | null;
    alertPercent?: number | null;
    notes?: string | null;
    isActive?: boolean;
    status?: BudgetStatus;
    isVisible?: boolean;
}

export interface CreateBudgetServiceInput {
    workspaceId: Types.ObjectId;
    body: CreateBudgetBody;
    workspace: WorkspaceDocument;
}

export interface UpdateBudgetServiceInput {
    workspaceId: Types.ObjectId;
    budgetId: Types.ObjectId;
    body: UpdateBudgetBody;
    workspace: WorkspaceDocument;
}

export interface DeleteBudgetServiceInput {
    workspaceId: Types.ObjectId;
    budgetId: Types.ObjectId;
    workspace: WorkspaceDocument;
}