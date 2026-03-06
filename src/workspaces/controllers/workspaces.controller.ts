// src/workspaces/controllers/workspace.controller.ts

import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    archiveWorkspaceService,
    createWorkspaceService,
    getWorkspaceByIdService,
    getWorkspacesService,
    updateWorkspaceService,
} from "../services/workspaces.service";
import type {
    CreateWorkspaceBody,
    UpdateWorkspaceBody,
    WorkspaceParams,
} from "../types/workspace.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new Error("Invalid ObjectId.");
    }

    return new Types.ObjectId(value);
}

export const createWorkspaceController: RequestHandler<
    Record<string, never>,
    object,
    CreateWorkspaceBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.user?.id) {
            res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Unauthorized",
            });
            return;
        }

        const ownerUserId = getObjectIdOrThrow(req.user.id);

        const workspace = await createWorkspaceService({
            ownerUserId,
            body: req.body,
        });

        res.status(201).json({
            message: "Workspace creado correctamente.",
            workspace,
        });
    } catch (error) {
        next(error);
    }
};

export const getWorkspacesController: RequestHandler = async (
    req,
    res,
    next
): Promise<void> => {
    try {
        if (!req.user?.id) {
            res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Unauthorized",
            });
            return;
        }

        const ownerUserId = getObjectIdOrThrow(req.user.id);

        const includeArchived = req.query.includeArchived === "true";
        const includeInactive = req.query.includeInactive === "true";

        const workspaces = await getWorkspacesService({
            ownerUserId,
            includeArchived,
            includeInactive,
        });

        res.status(200).json({
            message: "Workspaces obtenidos correctamente.",
            workspaces,
        });
    } catch (error) {
        next(error);
    }
};

export const getWorkspaceByIdController: RequestHandler<
    WorkspaceParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.user?.id) {
            res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Unauthorized",
            });
            return;
        }

        const ownerUserId = getObjectIdOrThrow(req.user.id);
        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);

        const workspace = await getWorkspaceByIdService(workspaceId, ownerUserId);

        if (!workspace) {
            res.status(404).json({
                message: "Workspace no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Workspace obtenido correctamente.",
            workspace,
        });
    } catch (error) {
        next(error);
    }
};

export const updateWorkspaceController: RequestHandler<
    WorkspaceParams,
    object,
    UpdateWorkspaceBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.user?.id) {
            res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Unauthorized",
            });
            return;
        }

        const ownerUserId = getObjectIdOrThrow(req.user.id);
        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);

        const workspace = await updateWorkspaceService({
            workspaceId,
            ownerUserId,
            body: req.body,
        });

        if (!workspace) {
            res.status(404).json({
                message: "Workspace no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Workspace actualizado correctamente.",
            workspace,
        });
    } catch (error) {
        next(error);
    }
};

export const archiveWorkspaceController: RequestHandler<
    WorkspaceParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.user?.id) {
            res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Unauthorized",
            });
            return;
        }

        const ownerUserId = getObjectIdOrThrow(req.user.id);
        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);

        const workspace = await archiveWorkspaceService(workspaceId, ownerUserId);

        if (!workspace) {
            res.status(404).json({
                message: "Workspace no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Workspace archivado correctamente.",
            workspace,
        });
    } catch (error) {
        next(error);
    }
};