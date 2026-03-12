import type { Types } from "mongoose";

import type { ReportAnalyticsQuery, ReportDocument, ReportType } from "./reports.types";
import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";

export const REPORT_EXPORT_FORMAT_VALUES = ["csv", "xlsx"] as const;

export type ReportExportFormat = (typeof REPORT_EXPORT_FORMAT_VALUES)[number];

export interface ExportReportBody {
    name: string;
    notes?: string | null;
    filters?: ReportAnalyticsQuery | null;
    exportFormat: ReportExportFormat;
    generatedByMemberId?: string | null;
    persistReport?: boolean;
}

export interface ExportReportFileResult {
    format: ReportExportFormat;
    fileName: string;
    fileUrl: string | null;
}

export interface ExportReportResponse {
    report: ReportDocument | null;
    file: ExportReportFileResult;
}

export interface ExportReportServiceInput {
    workspaceId: Types.ObjectId;
    body: ExportReportBody;
    workspace: WorkspaceDocument;
}

export interface ExportMonthlySummaryServiceInput extends ExportReportServiceInput {
    reportType: Extract<ReportType, "monthly_summary">;
}

export interface ExportCategoryBreakdownServiceInput extends ExportReportServiceInput {
    reportType: Extract<ReportType, "category_breakdown">;
}

export interface ExportDebtSummaryServiceInput extends ExportReportServiceInput {
    reportType: Extract<ReportType, "debt_report">;
}

export interface ExportBudgetSummaryServiceInput extends ExportReportServiceInput {
    reportType: Extract<ReportType, "budget_report">;
}