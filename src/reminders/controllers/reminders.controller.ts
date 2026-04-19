// src/reminders/controllers/reminders.controller.ts

import type { RequestHandler } from "express";
import { Types } from "mongoose";

import type { MemberRole } from "@/src/shared/types/common";
import {
    ReminderServiceError,
    createReminderService,
    deleteReminderService,
    getReminderByIdService,
    getRemindersService,
    isReminderServiceError,
    markReminderAsViewedService,
    respondToReminderService,
    updateReminderService,
} from "../services/reminders.service";
import type {
    CreateReminderBody,
    ReminderParams,
    RespondToReminderBody,
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

function getWorkspaceMemberContextOrThrow(req: {
    workspaceMember?: { _id: Types.ObjectId; role: MemberRole };
}): {
    workspaceMemberId: Types.ObjectId;
    workspaceMemberRole: MemberRole;
} {
    if (!req.workspaceMember?._id) {
        throw new ReminderServiceError(
            "No se pudo resolver el miembro del workspace.",
            403,
            "WORKSPACE_MEMBER_NOT_FOUND"
        );
    }

    return {
        workspaceMemberId: req.workspaceMember._id,
        workspaceMemberRole: req.workspaceMember.role,
    };
}

export const getRemindersController: RequestHandler<
    WorkspaceReminderParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace || !req.workspaceMember) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const actor = getWorkspaceMemberContextOrThrow(req);

        const reminders = await getRemindersService(
            workspaceId,
            actor.workspaceMemberId,
            actor.workspaceMemberRole
        );

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
        if (!req.workspace || !req.workspaceMember) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const reminderId = getObjectIdOrThrow(req.params.reminderId);
        const actor = getWorkspaceMemberContextOrThrow(req);

        const reminder = await getReminderByIdService(
            workspaceId,
            reminderId,
            actor.workspaceMemberId,
            actor.workspaceMemberRole
        );

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
        if (!req.workspace || !req.workspaceMember) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const actor = getWorkspaceMemberContextOrThrow(req);

        const reminder = await createReminderService({
            workspaceId,
            body: req.body,
            workspace: req.workspace,
            actor,
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
        if (!req.workspace || !req.workspaceMember) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const reminderId = getObjectIdOrThrow(req.params.reminderId);
        const actor = getWorkspaceMemberContextOrThrow(req);

        const reminder = await updateReminderService({
            workspaceId,
            reminderId,
            body: req.body,
            workspace: req.workspace,
            actor,
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

export const markReminderAsViewedController: RequestHandler<
    ReminderParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace || !req.workspaceMember) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const reminderId = getObjectIdOrThrow(req.params.reminderId);
        const actor = getWorkspaceMemberContextOrThrow(req);

        const reminder = await markReminderAsViewedService(
            workspaceId,
            reminderId,
            actor.workspaceMemberId,
            actor.workspaceMemberRole
        );

        if (!reminder) {
            res.status(404).json({
                code: "REMINDER_NOT_FOUND",
                message: "Recordatorio no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Recordatorio marcado como visto correctamente.",
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

export const respondToReminderController: RequestHandler<
    ReminderParams,
    object,
    RespondToReminderBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace || !req.workspaceMember) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const reminderId = getObjectIdOrThrow(req.params.reminderId);
        const actor = getWorkspaceMemberContextOrThrow(req);

        const reminder = await respondToReminderService(
            workspaceId,
            reminderId,
            actor.workspaceMemberId,
            actor.workspaceMemberRole,
            req.body
        );

        if (!reminder) {
            res.status(404).json({
                code: "REMINDER_NOT_FOUND",
                message: "Recordatorio no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Respuesta del recordatorio guardada correctamente.",
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
        if (!req.workspace || !req.workspaceMember) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const reminderId = getObjectIdOrThrow(req.params.reminderId);
        const actor = getWorkspaceMemberContextOrThrow(req);

        const reminder = await deleteReminderService({
            workspaceId,
            reminderId,
            workspace: req.workspace,
            actor,
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