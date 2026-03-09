import { Router } from "express";

import {
    createReportController,
    deleteReportController,
    getReportByIdController,
    getReportsController,
    updateReportController,
} from "../controllers/reports.controller";
import {
    createReportSchema,
    reportParamsSchema,
    updateReportSchema,
    workspaceReportParamsSchema,
} from "../schemas/reports.schemas";
import type {
    CreateReportBody,
    ReportParams,
    UpdateReportBody,
    WorkspaceReportParams,
} from "../types/reports.types";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

const reportRouter = Router({ mergeParams: true });

reportRouter.use(requireWorkspaceAccess());

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