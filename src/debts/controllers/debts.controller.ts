// src/debts/controllers/debts.controller.ts

import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    createDebtService,
    deleteDebtService,
    getDebtByIdService,
    getDebtsService,
    isDebtServiceError,
    DebtServiceError,
    updateDebtService,
} from "../services/debts.service";
import type {
    CreateDebtBody,
    DebtParams,
    UpdateDebtBody,
    WorkspaceDebtParams,
} from "../types/debts.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new DebtServiceError(
            "El id proporcionado no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(value);
}

export const getDebtsController: RequestHandler<
    WorkspaceDebtParams
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
        const debts = await getDebtsService(workspaceId);

        res.status(200).json({
            message: "Deudas obtenidas correctamente.",
            debts,
        });
    } catch (error) {
        if (error instanceof Error && isDebtServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const getDebtByIdController: RequestHandler<
    DebtParams
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
        const debtId = getObjectIdOrThrow(req.params.debtId);

        const debt = await getDebtByIdService(workspaceId, debtId);

        if (!debt) {
            res.status(404).json({
                code: "DEBT_NOT_FOUND",
                message: "Deuda no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Deuda obtenida correctamente.",
            debt,
        });
    } catch (error) {
        if (error instanceof Error && isDebtServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const createDebtController: RequestHandler<
    WorkspaceDebtParams,
    object,
    CreateDebtBody
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

        const debt = await createDebtService({
            workspaceId,
            body: req.body,
            workspace: req.workspace,
        });

        res.status(201).json({
            message: "Deuda creada correctamente.",
            debt,
        });
    } catch (error) {
        if (error instanceof Error && isDebtServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updateDebtController: RequestHandler<
    DebtParams,
    object,
    UpdateDebtBody
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
        const debtId = getObjectIdOrThrow(req.params.debtId);

        const debt = await updateDebtService({
            workspaceId,
            debtId,
            body: req.body,
            workspace: req.workspace,
        });

        if (!debt) {
            res.status(404).json({
                code: "DEBT_NOT_FOUND",
                message: "Deuda no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Deuda actualizada correctamente.",
            debt,
        });
    } catch (error) {
        if (error instanceof Error && isDebtServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const deleteDebtController: RequestHandler<
    DebtParams
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
        const debtId = getObjectIdOrThrow(req.params.debtId);

        const debt = await deleteDebtService({
            workspaceId,
            debtId,
            workspace: req.workspace,
        });

        if (!debt) {
            res.status(404).json({
                code: "DEBT_NOT_FOUND",
                message: "Deuda no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Deuda eliminada correctamente.",
            debt,
        });
    } catch (error) {
        if (error instanceof Error && isDebtServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};