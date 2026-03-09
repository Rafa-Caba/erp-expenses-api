import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    SavingGoalServiceError,
    createSavingGoalService,
    deleteSavingGoalService,
    getSavingGoalByIdService,
    getSavingGoalsService,
    isSavingGoalServiceError,
    updateSavingGoalService,
} from "../services/savingGoals.service";
import type {
    CreateSavingsGoalBody,
    SavingsGoalParams,
    UpdateSavingsGoalBody,
    WorkspaceSavingsGoalParams,
} from "../types/savingGoals.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new SavingGoalServiceError(
            "El id proporcionado no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(value);
}

export const getSavingGoalsController: RequestHandler<
    WorkspaceSavingsGoalParams
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
        const savingGoals = await getSavingGoalsService(workspaceId);

        res.status(200).json({
            message: "Metas de ahorro obtenidas correctamente.",
            savingGoals,
        });
    } catch (error) {
        if (error instanceof Error && isSavingGoalServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const getSavingGoalByIdController: RequestHandler<
    SavingsGoalParams
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
        const savingsGoalId = getObjectIdOrThrow(req.params.savingsGoalId);

        const savingGoal = await getSavingGoalByIdService(workspaceId, savingsGoalId);

        if (!savingGoal) {
            res.status(404).json({
                code: "SAVING_GOAL_NOT_FOUND",
                message: "Meta de ahorro no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Meta de ahorro obtenida correctamente.",
            savingGoal,
        });
    } catch (error) {
        if (error instanceof Error && isSavingGoalServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const createSavingGoalController: RequestHandler<
    WorkspaceSavingsGoalParams,
    object,
    CreateSavingsGoalBody
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

        const savingGoal = await createSavingGoalService({
            workspaceId,
            body: req.body,
            workspace: req.workspace,
        });

        res.status(201).json({
            message: "Meta de ahorro creada correctamente.",
            savingGoal,
        });
    } catch (error) {
        if (error instanceof Error && isSavingGoalServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updateSavingGoalController: RequestHandler<
    SavingsGoalParams,
    object,
    UpdateSavingsGoalBody
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
        const savingsGoalId = getObjectIdOrThrow(req.params.savingsGoalId);

        const savingGoal = await updateSavingGoalService({
            workspaceId,
            savingsGoalId,
            body: req.body,
            workspace: req.workspace,
        });

        if (!savingGoal) {
            res.status(404).json({
                code: "SAVING_GOAL_NOT_FOUND",
                message: "Meta de ahorro no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Meta de ahorro actualizada correctamente.",
            savingGoal,
        });
    } catch (error) {
        if (error instanceof Error && isSavingGoalServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const deleteSavingGoalController: RequestHandler<
    SavingsGoalParams
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
        const savingsGoalId = getObjectIdOrThrow(req.params.savingsGoalId);

        const savingGoal = await deleteSavingGoalService({
            workspaceId,
            savingsGoalId,
            workspace: req.workspace,
        });

        if (!savingGoal) {
            res.status(404).json({
                code: "SAVING_GOAL_NOT_FOUND",
                message: "Meta de ahorro no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Meta de ahorro eliminada correctamente.",
            savingGoal,
        });
    } catch (error) {
        if (error instanceof Error && isSavingGoalServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};