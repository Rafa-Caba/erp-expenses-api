import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    BudgetServiceError,
    createBudgetService,
    deleteBudgetService,
    getBudgetByIdService,
    getBudgetsService,
    isBudgetServiceError,
    updateBudgetService,
} from "../services/budgets.service";
import type {
    BudgetParams,
    CreateBudgetBody,
    UpdateBudgetBody,
    WorkspaceBudgetParams,
} from "../types/budgets.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new BudgetServiceError(
            "El id proporcionado no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(value);
}

export const getBudgetsController: RequestHandler<
    WorkspaceBudgetParams
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
        const budgets = await getBudgetsService(workspaceId);

        res.status(200).json({
            message: "Presupuestos obtenidos correctamente.",
            budgets,
        });
    } catch (error) {
        if (error instanceof Error && isBudgetServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const getBudgetByIdController: RequestHandler<
    BudgetParams
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
        const budgetId = getObjectIdOrThrow(req.params.budgetId);

        const budget = await getBudgetByIdService(workspaceId, budgetId);

        if (!budget) {
            res.status(404).json({
                code: "BUDGET_NOT_FOUND",
                message: "Presupuesto no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Presupuesto obtenido correctamente.",
            budget,
        });
    } catch (error) {
        if (error instanceof Error && isBudgetServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const createBudgetController: RequestHandler<
    WorkspaceBudgetParams,
    object,
    CreateBudgetBody
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

        const budget = await createBudgetService({
            workspaceId,
            body: req.body,
            workspace: req.workspace,
        });

        res.status(201).json({
            message: "Presupuesto creado correctamente.",
            budget,
        });
    } catch (error) {
        if (error instanceof Error && isBudgetServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updateBudgetController: RequestHandler<
    BudgetParams,
    object,
    UpdateBudgetBody
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
        const budgetId = getObjectIdOrThrow(req.params.budgetId);

        const budget = await updateBudgetService({
            workspaceId,
            budgetId,
            body: req.body,
            workspace: req.workspace,
        });

        if (!budget) {
            res.status(404).json({
                code: "BUDGET_NOT_FOUND",
                message: "Presupuesto no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Presupuesto actualizado correctamente.",
            budget,
        });
    } catch (error) {
        if (error instanceof Error && isBudgetServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const deleteBudgetController: RequestHandler<
    BudgetParams
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
        const budgetId = getObjectIdOrThrow(req.params.budgetId);

        const budget = await deleteBudgetService({
            workspaceId,
            budgetId,
            workspace: req.workspace,
        });

        if (!budget) {
            res.status(404).json({
                code: "BUDGET_NOT_FOUND",
                message: "Presupuesto no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Presupuesto eliminado correctamente.",
            budget,
        });
    } catch (error) {
        if (error instanceof Error && isBudgetServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};