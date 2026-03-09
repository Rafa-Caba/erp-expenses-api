import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";
import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";

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