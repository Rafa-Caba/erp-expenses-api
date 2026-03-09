import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    ReportServiceError,
    createReportService,
    deleteReportService,
    getReportByIdService,
    getReportsService,
    isReportServiceError,
    updateReportService,
} from "../services/reports.service";
import type {
    CreateReportBody,
    ReportParams,
    UpdateReportBody,
    WorkspaceReportParams,
} from "../types/reports.types";

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

export const getReportsController: RequestHandler<
    WorkspaceReportParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const reports = await getReportsService(workspaceId);

        res.status(200).json({
            message: "Reportes obtenidos correctamente.",
            reports,
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

export const getReportByIdController: RequestHandler<
    ReportParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const reportId = getObjectIdOrThrow(req.params.reportId);

        const report = await getReportByIdService(workspaceId, reportId);

        if (!report) {
            res.status(404).json({
                code: "REPORT_NOT_FOUND",
                message: "Reporte no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Reporte obtenido correctamente.",
            report,
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

export const createReportController: RequestHandler<
    WorkspaceReportParams,
    object,
    CreateReportBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);

        const report = await createReportService({
            workspaceId,
            body: req.body,
            workspace: req.workspace,
        });

        res.status(201).json({
            message: "Reporte creado correctamente.",
            report,
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

export const updateReportController: RequestHandler<
    ReportParams,
    object,
    UpdateReportBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const reportId = getObjectIdOrThrow(req.params.reportId);

        const report = await updateReportService({
            workspaceId,
            reportId,
            body: req.body,
            workspace: req.workspace,
        });

        if (!report) {
            res.status(404).json({
                code: "REPORT_NOT_FOUND",
                message: "Reporte no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Reporte actualizado correctamente.",
            report,
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

export const deleteReportController: RequestHandler<
    ReportParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const reportId = getObjectIdOrThrow(req.params.reportId);

        const report = await deleteReportService({
            workspaceId,
            reportId,
            workspace: req.workspace,
        });

        if (!report) {
            res.status(404).json({
                code: "REPORT_NOT_FOUND",
                message: "Reporte no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Reporte eliminado correctamente.",
            report,
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