import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    ReportServiceError,
    isReportServiceError,
} from "../services/reports.service";
import {
    exportBudgetSummaryService,
    exportCategoryBreakdownService,
    exportDebtSummaryService,
    exportMonthlySummaryService,
} from "../services/reportExports.service";
import type { ExportReportBody } from "../types/reportExports.types";
import type { WorkspaceReportParams } from "../types/reports.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new ReportServiceError(
            "El id proporcionado no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(value);
}

export const exportMonthlySummaryController: RequestHandler<
    WorkspaceReportParams,
    object,
    ExportReportBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const response = await exportMonthlySummaryService({
            workspaceId: getObjectIdOrThrow(req.params.workspaceId),
            body: req.body,
            workspace: req.workspace,
            reportType: "monthly_summary",
        });

        res.status(201).json({
            message: "Exportación de resumen mensual generada correctamente.",
            report: response.report,
            file: response.file,
        });
    } catch (error) {
        if (error instanceof Error && isReportServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const exportCategoryBreakdownController: RequestHandler<
    WorkspaceReportParams,
    object,
    ExportReportBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const response = await exportCategoryBreakdownService({
            workspaceId: getObjectIdOrThrow(req.params.workspaceId),
            body: req.body,
            workspace: req.workspace,
            reportType: "category_breakdown",
        });

        res.status(201).json({
            message: "Exportación de desglose por categoría generada correctamente.",
            report: response.report,
            file: response.file,
        });
    } catch (error) {
        if (error instanceof Error && isReportServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const exportDebtSummaryController: RequestHandler<
    WorkspaceReportParams,
    object,
    ExportReportBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const response = await exportDebtSummaryService({
            workspaceId: getObjectIdOrThrow(req.params.workspaceId),
            body: req.body,
            workspace: req.workspace,
            reportType: "debt_report",
        });

        res.status(201).json({
            message: "Exportación de resumen de deudas generada correctamente.",
            report: response.report,
            file: response.file,
        });
    } catch (error) {
        if (error instanceof Error && isReportServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const exportBudgetSummaryController: RequestHandler<
    WorkspaceReportParams,
    object,
    ExportReportBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const response = await exportBudgetSummaryService({
            workspaceId: getObjectIdOrThrow(req.params.workspaceId),
            body: req.body,
            workspace: req.workspace,
            reportType: "budget_report",
        });

        res.status(201).json({
            message: "Exportación de resumen de presupuestos generada correctamente.",
            report: response.report,
            file: response.file,
        });
    } catch (error) {
        if (error instanceof Error && isReportServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};