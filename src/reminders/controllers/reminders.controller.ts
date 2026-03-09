import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    ReminderServiceError,
    createReminderService,
    deleteReminderService,
    getReminderByIdService,
    getRemindersService,
    isReminderServiceError,
    updateReminderService,
} from "../services/reminders.service";
import type {
    CreateReminderBody,
    ReminderParams,
    UpdateReminderBody,
    WorkspaceReminderParams,
} from "../types/reminders.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new ReminderServiceError(
            "El id proporcionado no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(value);
}

export const getRemindersController: RequestHandler<
    WorkspaceReminderParams
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
        const reminders = await getRemindersService(workspaceId);

        res.status(200).json({
            message: "Recordatorios obtenidos correctamente.",
            reminders,
        });
    } catch (error) {
        if (error instanceof Error && isReminderServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const getReminderByIdController: RequestHandler<
    ReminderParams
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
        const reminderId = getObjectIdOrThrow(req.params.reminderId);

        const reminder = await getReminderByIdService(workspaceId, reminderId);

        if (!reminder) {
            res.status(404).json({
                code: "REMINDER_NOT_FOUND",
                message: "Recordatorio no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Recordatorio obtenido correctamente.",
            reminder,
        });
    } catch (error) {
        if (error instanceof Error && isReminderServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const createReminderController: RequestHandler<
    WorkspaceReminderParams,
    object,
    CreateReminderBody
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

        const reminder = await createReminderService({
            workspaceId,
            body: req.body,
            workspace: req.workspace,
        });

        res.status(201).json({
            message: "Recordatorio creado correctamente.",
            reminder,
        });
    } catch (error) {
        if (error instanceof Error && isReminderServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updateReminderController: RequestHandler<
    ReminderParams,
    object,
    UpdateReminderBody
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
        const reminderId = getObjectIdOrThrow(req.params.reminderId);

        const reminder = await updateReminderService({
            workspaceId,
            reminderId,
            body: req.body,
            workspace: req.workspace,
        });

        if (!reminder) {
            res.status(404).json({
                code: "REMINDER_NOT_FOUND",
                message: "Recordatorio no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Recordatorio actualizado correctamente.",
            reminder,
        });
    } catch (error) {
        if (error instanceof Error && isReminderServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const deleteReminderController: RequestHandler<
    ReminderParams
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
        const reminderId = getObjectIdOrThrow(req.params.reminderId);

        const reminder = await deleteReminderService({
            workspaceId,
            reminderId,
            workspace: req.workspace,
        });

        if (!reminder) {
            res.status(404).json({
                code: "REMINDER_NOT_FOUND",
                message: "Recordatorio no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Recordatorio eliminado correctamente.",
            reminder,
        });
    } catch (error) {
        if (error instanceof Error && isReminderServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};