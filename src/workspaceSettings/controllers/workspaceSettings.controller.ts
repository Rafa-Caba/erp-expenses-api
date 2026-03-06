// src/workspaceSettings/controllers/workspaceSettings.controller.ts

import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    getWorkspaceSettingsService,
    isWorkspaceSettingsServiceError,
    updateWorkspaceSettingsService,
    WorkspaceSettingsServiceError,
} from "../services/workspaceSettings.service";
import type {
    UpdateWorkspaceSettingsBody,
    WorkspaceSettingsParams,
} from "../types/workspaceSettings.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new WorkspaceSettingsServiceError(
            "El id proporcionado no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(value);
}

export const getWorkspaceSettingsController: RequestHandler<
    WorkspaceSettingsParams
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
        const settings = await getWorkspaceSettingsService(workspaceId);

        if (!settings) {
            res.status(404).json({
                code: "WORKSPACE_SETTINGS_NOT_FOUND",
                message: "Settings no encontrados.",
            });
            return;
        }

        res.status(200).json({
            message: "Settings obtenidos correctamente.",
            settings,
        });
    } catch (error) {
        if (error instanceof Error && isWorkspaceSettingsServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updateWorkspaceSettingsController: RequestHandler<
    WorkspaceSettingsParams,
    object,
    UpdateWorkspaceSettingsBody
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

        const settings = await updateWorkspaceSettingsService({
            workspaceId,
            body: req.body,
        });

        if (!settings) {
            res.status(404).json({
                code: "WORKSPACE_SETTINGS_NOT_FOUND",
                message: "Settings no encontrados.",
            });
            return;
        }

        res.status(200).json({
            message: "Settings actualizados correctamente.",
            settings,
        });
    } catch (error) {
        if (error instanceof Error && isWorkspaceSettingsServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};