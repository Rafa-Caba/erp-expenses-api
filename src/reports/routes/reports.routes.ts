import { Router } from "express";

import {
    createReportController,
    deleteReportController,
    getBudgetSummaryAnalyticsController,
    getCategoryBreakdownAnalyticsController,
    getDebtSummaryAnalyticsController,
    getMonthlySummaryAnalyticsController,
    getReportByIdController,
    getReportsController,
    updateReportController,
} from "../controllers/reports.controller";
import {
    exportBudgetSummaryController,
    exportCategoryBreakdownController,
    exportDebtSummaryController,
    exportMonthlySummaryController,
} from "../controllers/reportExports.controller";
import {
    createReportSchema,
    reportAnalyticsQueryRequestSchema,
    reportParamsSchema,
    updateReportSchema,
    workspaceReportParamsSchema,
} from "../schemas/reports.schemas";
import { exportReportSchema } from "../schemas/reportExports.schemas";
import type {
    CreateReportBody,
    ReportParams,
    UpdateReportBody,
    WorkspaceReportParams,
} from "../types/reports.types";
import type { ExportReportBody } from "../types/reportExports.types";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

const reportRouter = Router({ mergeParams: true });

reportRouter.use(requireWorkspaceAccess());

reportRouter.get<WorkspaceReportParams>(
    "/analytics/monthly-summary",
    validateRequest(workspaceReportParamsSchema),
    validateRequest(reportAnalyticsQueryRequestSchema),
    requireWorkspacePermission("reports.read"),
    getMonthlySummaryAnalyticsController
);

reportRouter.get<WorkspaceReportParams>(
    "/analytics/category-breakdown",
    validateRequest(workspaceReportParamsSchema),
    validateRequest(reportAnalyticsQueryRequestSchema),
    requireWorkspacePermission("reports.read"),
    getCategoryBreakdownAnalyticsController
);

reportRouter.get<WorkspaceReportParams>(
    "/analytics/debt-summary",
    validateRequest(workspaceReportParamsSchema),
    validateRequest(reportAnalyticsQueryRequestSchema),
    requireWorkspacePermission("reports.read"),
    getDebtSummaryAnalyticsController
);

reportRouter.get<WorkspaceReportParams>(
    "/analytics/budget-summary",
    validateRequest(workspaceReportParamsSchema),
    validateRequest(reportAnalyticsQueryRequestSchema),
    requireWorkspacePermission("reports.read"),
    getBudgetSummaryAnalyticsController
);

reportRouter.post<WorkspaceReportParams, object, ExportReportBody>(
    "/exports/monthly-summary",
    validateRequest(workspaceReportParamsSchema),
    validateRequest(exportReportSchema),
    requireWorkspacePermission("reports.create"),
    exportMonthlySummaryController
);

reportRouter.post<WorkspaceReportParams, object, ExportReportBody>(
    "/exports/category-breakdown",
    validateRequest(workspaceReportParamsSchema),
    validateRequest(exportReportSchema),
    requireWorkspacePermission("reports.create"),
    exportCategoryBreakdownController
);

reportRouter.post<WorkspaceReportParams, object, ExportReportBody>(
    "/exports/debt-summary",
    validateRequest(workspaceReportParamsSchema),
    validateRequest(exportReportSchema),
    requireWorkspacePermission("reports.create"),
    exportDebtSummaryController
);

reportRouter.post<WorkspaceReportParams, object, ExportReportBody>(
    "/exports/budget-summary",
    validateRequest(workspaceReportParamsSchema),
    validateRequest(exportReportSchema),
    requireWorkspacePermission("reports.create"),
    exportBudgetSummaryController
);

reportRouter.get<WorkspaceReportParams>(
    "/",
    validateRequest(workspaceReportParamsSchema),
    requireWorkspacePermission("reports.read"),
    getReportsController
);

reportRouter.get<ReportParams>(
    "/:reportId",
    validateRequest(reportParamsSchema),
    requireWorkspacePermission("reports.read"),
    getReportByIdController
);

reportRouter.post<WorkspaceReportParams, object, CreateReportBody>(
    "/",
    validateRequest(workspaceReportParamsSchema),
    validateRequest(createReportSchema),
    requireWorkspacePermission("reports.create"),
    createReportController
);

reportRouter.patch<ReportParams, object, UpdateReportBody>(
    "/:reportId",
    validateRequest(reportParamsSchema),
    validateRequest(updateReportSchema),
    requireWorkspacePermission("reports.update"),
    updateReportController
);

reportRouter.delete<ReportParams>(
    "/:reportId",
    validateRequest(reportParamsSchema),
    requireWorkspacePermission("reports.delete"),
    deleteReportController
);

export { reportRouter };