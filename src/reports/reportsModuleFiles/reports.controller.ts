import type { RequestHandler } from "express";
import { Types } from "mongoose";
import type { ParsedQs } from "qs";

import {
    ReportServiceError,
    createReportService,
    deleteReportService,
    getBudgetSummaryReportService,
    getCategoryBreakdownReportService,
    getDebtSummaryReportService,
    getMonthlySummaryReportService,
    getReportByIdService,
    getReportsService,
    isReportServiceError,
    updateReportService,
} from "../services/reports.service";
import type {
    CreateReportBody,
    ReportAnalyticsQuery,
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

function getQueryStringValue(
    value: string | ParsedQs | (string | ParsedQs)[] | undefined
): string | null {
    if (typeof value === "string") {
        return value;
    }

    if (Array.isArray(value)) {
        const firstValue = value[0];

        return typeof firstValue === "string" ? firstValue : null;
    }

    return null;
}

function getQueryBooleanValue(
    value: string | ParsedQs | (string | ParsedQs)[] | undefined
): boolean | null {
    const parsedValue = getQueryStringValue(value);

    if (parsedValue === "true") {
        return true;
    }

    if (parsedValue === "false") {
        return false;
    }

    return null;
}

function getQueryCurrencyValue(
    value: string | ParsedQs | (string | ParsedQs)[] | undefined
): "MXN" | "USD" | null {
    const parsedValue = getQueryStringValue(value);

    if (parsedValue === "MXN" || parsedValue === "USD") {
        return parsedValue;
    }

    return null;
}

function getQueryGroupByValue(
    value: string | ParsedQs | (string | ParsedQs)[] | undefined
): "day" | "week" | "month" | "category" | "member" | null {
    const parsedValue = getQueryStringValue(value);

    if (
        parsedValue === "day" ||
        parsedValue === "week" ||
        parsedValue === "month" ||
        parsedValue === "category" ||
        parsedValue === "member"
    ) {
        return parsedValue;
    }

    return null;
}

function buildAnalyticsQuery(query: ParsedQs): ReportAnalyticsQuery {
    return {
        dateFrom: getQueryStringValue(query.dateFrom),
        dateTo: getQueryStringValue(query.dateTo),
        currency: getQueryCurrencyValue(query.currency),
        memberId: getQueryStringValue(query.memberId),
        categoryId: getQueryStringValue(query.categoryId),
        accountId: getQueryStringValue(query.accountId),
        cardId: getQueryStringValue(query.cardId),
        includeArchived: getQueryBooleanValue(query.includeArchived),
        groupBy: getQueryGroupByValue(query.groupBy),
    };
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

export const getMonthlySummaryAnalyticsController: RequestHandler<
    WorkspaceReportParams
> = async (req, res, next): Promise<void> => {
    try {
        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const analyticsQuery = buildAnalyticsQuery(req.query);

        const summary = await getMonthlySummaryReportService(
            workspaceId,
            analyticsQuery
        );

        res.status(200).json({
            message: "Resumen mensual obtenido correctamente.",
            summary,
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

export const getCategoryBreakdownAnalyticsController: RequestHandler<
    WorkspaceReportParams
> = async (req, res, next): Promise<void> => {
    try {
        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const analyticsQuery = buildAnalyticsQuery(req.query);

        const breakdown = await getCategoryBreakdownReportService(
            workspaceId,
            analyticsQuery
        );

        res.status(200).json({
            message: "Desglose por categoría obtenido correctamente.",
            breakdown,
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

export const getDebtSummaryAnalyticsController: RequestHandler<
    WorkspaceReportParams
> = async (req, res, next): Promise<void> => {
    try {
        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const analyticsQuery = buildAnalyticsQuery(req.query);

        const summary = await getDebtSummaryReportService(
            workspaceId,
            analyticsQuery
        );

        res.status(200).json({
            message: "Resumen de deudas obtenido correctamente.",
            summary,
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

export const getBudgetSummaryAnalyticsController: RequestHandler<
    WorkspaceReportParams
> = async (req, res, next): Promise<void> => {
    try {
        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const analyticsQuery = buildAnalyticsQuery(req.query);

        const summary = await getBudgetSummaryReportService(
            workspaceId,
            analyticsQuery
        );

        res.status(200).json({
            message: "Resumen de presupuestos obtenido correctamente.",
            summary,
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