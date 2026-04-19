// src/middlewares/requireWorkspacePermission.ts

import type { RequestHandler } from "express";

import type { MemberRole } from "@/src/shared/types/common";
import type { WorkspacePermission } from "@/src/shared/types/workspacePermissions";

type WorkspaceMemberWithPermissions = {
    _id: string;
    role: MemberRole;
    permissions: WorkspacePermission[];
    status: "active" | "invited" | "disabled";
};

function hasWorkspacePermission(
    workspaceMember: WorkspaceMemberWithPermissions,
    requiredPermission: WorkspacePermission
): boolean {
    if (workspaceMember.role === "OWNER") {
        return true;
    }

    return workspaceMember.permissions.includes(requiredPermission);
}

export function requireWorkspacePermission(
    requiredPermission: WorkspacePermission
): RequestHandler {
    return (req, res, next) => {
        const workspaceMember = req.workspaceMember as
            | WorkspaceMemberWithPermissions
            | undefined;

        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        if (!workspaceMember) {
            res.status(403).json({
                code: "WORKSPACE_MEMBER_NOT_FOUND",
                message: "No se pudo resolver el miembro del workspace.",
            });
            return;
        }

        if (workspaceMember.status !== "active") {
            res.status(403).json({
                code: "WORKSPACE_MEMBER_INACTIVE",
                message: "Tu membresía del workspace no está activa.",
            });
            return;
        }

        if (!hasWorkspacePermission(workspaceMember, requiredPermission)) {
            res.status(403).json({
                code: "WORKSPACE_PERMISSION_DENIED",
                message: "No tienes permisos para realizar esta acción en el workspace.",
                requiredPermission,
            });
            return;
        }

        next();
    };
}