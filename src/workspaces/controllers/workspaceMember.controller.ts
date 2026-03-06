// src/workspaces/controllers/workspaceMember.controller.ts

import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    createWorkspaceMemberService,
    deleteWorkspaceMemberService,
    getWorkspaceMembersService,
    isWorkspaceMemberServiceError,
    updateWorkspaceMemberService,
    updateWorkspaceMemberStatusService,
    WorkspaceMemberServiceError,
} from "../services/workspaceMember.service";
import type {
    CreateWorkspaceMemberBody,
    UpdateWorkspaceMemberBody,
    UpdateWorkspaceMemberStatusBody,
    WorkspaceMemberByIdParams,
    WorkspaceMemberParams,
} from "../types/workspaceMember.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new WorkspaceMemberServiceError(
            "El id proporcionado no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(value);
}

export const getWorkspaceMembersController: RequestHandler<
    WorkspaceMemberParams
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

        const members = await getWorkspaceMembersService(workspaceId);

        res.status(200).json({
            message: "Miembros obtenidos correctamente.",
            members,
        });
    } catch (error) {
        if (error instanceof Error && isWorkspaceMemberServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const createWorkspaceMemberController: RequestHandler<
    WorkspaceMemberParams,
    object,
    CreateWorkspaceMemberBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace || !req.workspaceMember || !req.user?.id) {
            res.status(403).json({
                code: "WORKSPACE_ACCESS_MISSING",
                message: "Forbidden",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const invitedByUserId = getObjectIdOrThrow(req.user.id);

        const member = await createWorkspaceMemberService({
            workspaceId,
            invitedByUserId,
            actorRole: req.workspaceMember.role,
            body: req.body,
        });

        res.status(201).json({
            message: "Miembro agregado correctamente.",
            member,
        });
    } catch (error) {
        if (error instanceof Error && isWorkspaceMemberServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updateWorkspaceMemberController: RequestHandler<
    WorkspaceMemberByIdParams,
    object,
    UpdateWorkspaceMemberBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace || !req.workspaceMember) {
            res.status(403).json({
                code: "WORKSPACE_ACCESS_MISSING",
                message: "Forbidden",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const memberId = getObjectIdOrThrow(req.params.memberId);

        const member = await updateWorkspaceMemberService({
            workspaceId,
            memberId,
            actorRole: req.workspaceMember.role,
            body: req.body,
        });

        if (!member) {
            res.status(404).json({
                code: "WORKSPACE_MEMBER_NOT_FOUND",
                message: "Miembro no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Miembro actualizado correctamente.",
            member,
        });
    } catch (error) {
        if (error instanceof Error && isWorkspaceMemberServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updateWorkspaceMemberStatusController: RequestHandler<
    WorkspaceMemberByIdParams,
    object,
    UpdateWorkspaceMemberStatusBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace || !req.workspaceMember) {
            res.status(403).json({
                code: "WORKSPACE_ACCESS_MISSING",
                message: "Forbidden",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const memberId = getObjectIdOrThrow(req.params.memberId);

        const member = await updateWorkspaceMemberStatusService({
            workspaceId,
            memberId,
            actorRole: req.workspaceMember.role,
            body: req.body,
        });

        if (!member) {
            res.status(404).json({
                code: "WORKSPACE_MEMBER_NOT_FOUND",
                message: "Miembro no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Status del miembro actualizado correctamente.",
            member,
        });
    } catch (error) {
        if (error instanceof Error && isWorkspaceMemberServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const deleteWorkspaceMemberController: RequestHandler<
    WorkspaceMemberByIdParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace || !req.workspaceMember) {
            res.status(403).json({
                code: "WORKSPACE_ACCESS_MISSING",
                message: "Forbidden",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const memberId = getObjectIdOrThrow(req.params.memberId);

        const member = await deleteWorkspaceMemberService({
            workspaceId,
            memberId,
            actorRole: req.workspaceMember.role,
        });

        if (!member) {
            res.status(404).json({
                code: "WORKSPACE_MEMBER_NOT_FOUND",
                message: "Miembro no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Miembro eliminado correctamente.",
            member,
        });
    } catch (error) {
        if (error instanceof Error && isWorkspaceMemberServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};