import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";
import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";
import type { BudgetStatus } from "@/src/budgets/types/budgets.types";

export const REPORT_TYPE_VALUES = [
    "monthly_summary",
    "category_breakdown",
    "debt_report",
    "budget_report",
    "custom",
] as const;

export type ReportType = (typeof REPORT_TYPE_VALUES)[number];

export const REPORT_STATUS_VALUES = [
    "pending",
    "generated",
    "failed",
    "archived",
] as const;

export type ReportStatus = (typeof REPORT_STATUS_VALUES)[number];

export const REPORT_GROUP_BY_VALUES = [
    "day",
    "week",
    "month",
    "category",
    "member",
] as const;

export type ReportGroupBy = (typeof REPORT_GROUP_BY_VALUES)[number];

export interface ReportFilters {
    dateFrom?: string | null;
    dateTo?: string | null;
    currency?: CurrencyCode | null;
    memberId?: string | null;
    categoryId?: string | null;
    accountId?: string | null;
    cardId?: string | null;
    includeArchived?: boolean | null;
    groupBy?: ReportGroupBy | null;
}

export interface ReportDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    name: string;
    type: ReportType;
    filters?: ReportFilters | null;
    generatedByMemberId?: Types.ObjectId | null;
    fileUrl?: string | null;
    notes?: string | null;
    status: ReportStatus;
    isVisible?: boolean;
    generatedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkspaceReportParams extends ParamsDictionary {
    workspaceId: string;
}

export interface ReportParams extends ParamsDictionary {
    workspaceId: string;
    reportId: string;
}

export interface CreateReportBody {
    name: string;
    type: ReportType;
    filters?: ReportFilters | null;
    generatedByMemberId?: string | null;
    fileUrl?: string | null;
    notes?: string | null;
    status?: ReportStatus;
    isVisible?: boolean;
    generatedAt?: string | null;
}

export interface UpdateReportBody {
    name?: string;
    type?: ReportType;
    filters?: ReportFilters | null;
    generatedByMemberId?: string | null;
    fileUrl?: string | null;
    notes?: string | null;
    status?: ReportStatus;
    isVisible?: boolean;
    generatedAt?: string | null;
}

export interface CreateReportServiceInput {
    workspaceId: Types.ObjectId;
    body: CreateReportBody;
    workspace: WorkspaceDocument;
}

export interface UpdateReportServiceInput {
    workspaceId: Types.ObjectId;
    reportId: Types.ObjectId;
    body: UpdateReportBody;
    workspace: WorkspaceDocument;
}

export interface DeleteReportServiceInput {
    workspaceId: Types.ObjectId;
    reportId: Types.ObjectId;
    workspace: WorkspaceDocument;
}

export interface ReportAnalyticsQuery {
    dateFrom?: string | null;
    dateTo?: string | null;
    currency?: CurrencyCode | null;
    memberId?: string | null;
    categoryId?: string | null;
    accountId?: string | null;
    cardId?: string | null;
    includeArchived?: boolean | null;
    groupBy?: ReportGroupBy | null;
}

export interface MonthlySummaryTotals {
    income: number;
    expenses: number;
    debtPayments: number;
    transfers: number;
    adjustments: number;
    netBalance: number;
}

export interface MonthlySummaryCounts {
    income: number;
    expenses: number;
    debtPayments: number;
    transfers: number;
    adjustments: number;
    total: number;
}

export interface MonthlySummaryCategoryItem {
    categoryId: Types.ObjectId | null;
    categoryName: string;
    totalAmount: number;
    transactionCount: number;
}

export interface MonthlySummarySeriesItem {
    label: string;
    income: number;
    expenses: number;
    debtPayments: number;
    transfers: number;
    adjustments: number;
    netBalance: number;
    transactionCount: number;
}

export interface MonthlySummaryReport {
    filters: ReportAnalyticsQuery;
    totals: MonthlySummaryTotals;
    counts: MonthlySummaryCounts;
    topExpenseCategories: MonthlySummaryCategoryItem[];
    series: MonthlySummarySeriesItem[];
}

export interface CategoryBreakdownItem {
    categoryId: Types.ObjectId | null;
    categoryName: string;
    totalAmount: number;
    transactionCount: number;
    percentageOfTotal: number;
}

export interface CategoryBreakdownSeriesItem {
    label: string;
    totalAmount: number;
    transactionCount: number;
}

export interface CategoryBreakdownReport {
    filters: ReportAnalyticsQuery;
    totalAmount: number;
    totalTransactions: number;
    categories: CategoryBreakdownItem[];
    series: CategoryBreakdownSeriesItem[];
}

export interface DebtSummaryCounts {
    total: number;
    active: number;
    paid: number;
    overdue: number;
    cancelled: number;
}

export interface DebtSummaryDirection {
    owedByMeCount: number;
    owedToMeCount: number;
    owedByMeOriginalAmount: number;
    owedToMeOriginalAmount: number;
    owedByMeRemainingAmount: number;
    owedToMeRemainingAmount: number;
}

export interface DebtSummarySeriesItem {
    label: string;
    createdDebtAmount: number;
    paidAmount: number;
    remainingAmount: number;
}

export interface DebtSummaryReport {
    filters: ReportAnalyticsQuery;
    counts: DebtSummaryCounts;
    direction: DebtSummaryDirection;
    totalOriginalAmount: number;
    totalRemainingAmount: number;
    completedPaymentsTotal: number;
    series: DebtSummarySeriesItem[];
}

export interface BudgetSummaryItem {
    budgetId: Types.ObjectId;
    name: string;
    currency: CurrencyCode;
    limitAmount: number;
    spentAmount: number;
    remainingAmount: number;
    usagePercent: number;
    hasReachedAlert: boolean;
    isExceeded: boolean;
    matchedTransactionCount: number;
    computedStatus: BudgetStatus;
    startDate: Date;
    endDate: Date;
    categoryId: Types.ObjectId | null;
    memberId: Types.ObjectId | null;
}

export interface BudgetSummarySeriesItem {
    label: string;
    totalLimitAmount: number;
    totalSpentAmount: number;
    totalRemainingAmount: number;
}

export interface BudgetSummaryTotals {
    budgetCount: number;
    totalLimitAmount: number;
    totalSpentAmount: number;
    totalRemainingAmount: number;
    exceededCount: number;
    alertReachedCount: number;
}

export interface BudgetSummaryReport {
    filters: ReportAnalyticsQuery;
    totals: BudgetSummaryTotals;
    budgets: BudgetSummaryItem[];
    series: BudgetSummarySeriesItem[];
}