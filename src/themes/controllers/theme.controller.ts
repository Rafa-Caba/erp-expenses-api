// src/themes/controllers/theme.controller.ts

import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    getThemeByKeyService,
    isThemeServiceError,
    listThemesByWorkspaceService,
    ThemeServiceError,
    updateThemeService,
} from "../services/theme.service";
import type {
    ThemeByKeyParams,
    ThemeParams,
    UpdateThemeBody,
} from "../types/theme.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new ThemeServiceError(
            "El id proporcionado no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(value);
}

export const listThemesController: RequestHandler<ThemeParams> = async (
    req,
    res,
    next
): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const themes = await listThemesByWorkspaceService(workspaceId);

        res.status(200).json({
            message: "Temas obtenidos correctamente.",
            themes,
        });
    } catch (error) {
        if (error instanceof Error && isThemeServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const getThemeByKeyController: RequestHandler<ThemeByKeyParams> = async (
    req,
    res,
    next
): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const theme = await getThemeByKeyService(workspaceId, req.params.themeKey);

        if (!theme) {
            res.status(404).json({
                code: "THEME_NOT_FOUND",
                message: "Tema no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Tema obtenido correctamente.",
            theme,
        });
    } catch (error) {
        if (error instanceof Error && isThemeServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updateThemeController: RequestHandler<
    ThemeByKeyParams,
    object,
    UpdateThemeBody
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

        const theme = await updateThemeService({
            workspaceId,
            themeKey: req.params.themeKey,
            body: req.body,
        });

        if (!theme) {
            res.status(404).json({
                code: "THEME_NOT_FOUND",
                message: "Tema no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Tema actualizado correctamente.",
            theme,
        });
    } catch (error) {
        if (error instanceof Error && isThemeServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};