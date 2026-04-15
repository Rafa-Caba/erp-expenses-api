// src/reconciliations/controllers/reconciliations.controller.ts

import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    createReconciliationService,
    deleteReconciliationService,
    getReconciliationByIdService,
    getReconciliationsService,
    getReconciliationSummaryService,
    isReconciliationServiceError,
    updateReconciliationService,
} from "../services/reconciliations.service";
import type {
    CreateReconciliationBody,
    ReconciliationListQuery,
    ReconciliationParams,
    UpdateReconciliationBody,
    WorkspaceReconciliationParams,
} from "../types/reconciliations.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new Error("INVALID_OBJECT_ID");
    }

    return new Types.ObjectId(value);
}

function getOptionalUserObjectId(
    userId?: string
): Types.ObjectId | null {
    if (!userId || !Types.ObjectId.isValid(userId)) {
        return null;
    }

    return new Types.ObjectId(userId);
}

export const getReconciliationsController: RequestHandler<
    WorkspaceReconciliationParams,
    object,
    object,
    ReconciliationListQuery
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
        const reconciliations = await getReconciliationsService(
            workspaceId,
            req.query
        );

        res.status(200).json({
            message: "Conciliaciones obtenidas correctamente.",
            reconciliations,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_OBJECT_ID") {
            res.status(400).json({
                code: "INVALID_OBJECT_ID",
                message: "El id proporcionado no es válido.",
            });
            return;
        }

        if (error instanceof Error && isReconciliationServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const getReconciliationSummaryController: RequestHandler<
    WorkspaceReconciliationParams,
    object,
    object,
    ReconciliationListQuery
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
        const summary = await getReconciliationSummaryService(
            workspaceId,
            req.query
        );

        res.status(200).json({
            message: "Resumen de conciliación obtenido correctamente.",
            summary,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_OBJECT_ID") {
            res.status(400).json({
                code: "INVALID_OBJECT_ID",
                message: "El id proporcionado no es válido.",
            });
            return;
        }

        if (error instanceof Error && isReconciliationServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const getReconciliationByIdController: RequestHandler<
    ReconciliationParams
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
        const reconciliationId = getObjectIdOrThrow(req.params.reconciliationId);

        const reconciliation = await getReconciliationByIdService(
            workspaceId,
            reconciliationId
        );

        if (!reconciliation) {
            res.status(404).json({
                code: "RECONCILIATION_NOT_FOUND",
                message: "Conciliación no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Conciliación obtenida correctamente.",
            reconciliation,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_OBJECT_ID") {
            res.status(400).json({
                code: "INVALID_OBJECT_ID",
                message: "El id proporcionado no es válido.",
            });
            return;
        }

        if (error instanceof Error && isReconciliationServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const createReconciliationController: RequestHandler<
    WorkspaceReconciliationParams,
    object,
    CreateReconciliationBody
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

        const reconciliation = await createReconciliationService({
            workspaceId,
            body: req.body,
            workspace: req.workspace,
            reconciledByUserId: getOptionalUserObjectId(req.user?.id),
        });

        res.status(201).json({
            message: "Conciliación creada correctamente.",
            reconciliation,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_OBJECT_ID") {
            res.status(400).json({
                code: "INVALID_OBJECT_ID",
                message: "El id proporcionado no es válido.",
            });
            return;
        }

        if (error instanceof Error && isReconciliationServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updateReconciliationController: RequestHandler<
    ReconciliationParams,
    object,
    UpdateReconciliationBody
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
        const reconciliationId = getObjectIdOrThrow(req.params.reconciliationId);

        const reconciliation = await updateReconciliationService({
            workspaceId,
            reconciliationId,
            body: req.body,
            workspace: req.workspace,
            reconciledByUserId: getOptionalUserObjectId(req.user?.id),
        });

        if (!reconciliation) {
            res.status(404).json({
                code: "RECONCILIATION_NOT_FOUND",
                message: "Conciliación no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Conciliación actualizada correctamente.",
            reconciliation,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_OBJECT_ID") {
            res.status(400).json({
                code: "INVALID_OBJECT_ID",
                message: "El id proporcionado no es válido.",
            });
            return;
        }

        if (error instanceof Error && isReconciliationServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const deleteReconciliationController: RequestHandler<
    ReconciliationParams
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
        const reconciliationId = getObjectIdOrThrow(req.params.reconciliationId);

        const reconciliation = await deleteReconciliationService({
            workspaceId,
            reconciliationId,
            workspace: req.workspace,
        });

        if (!reconciliation) {
            res.status(404).json({
                code: "RECONCILIATION_NOT_FOUND",
                message: "Conciliación no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Conciliación eliminada correctamente.",
            reconciliation,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_OBJECT_ID") {
            res.status(400).json({
                code: "INVALID_OBJECT_ID",
                message: "El id proporcionado no es válido.",
            });
            return;
        }

        if (error instanceof Error && isReconciliationServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};