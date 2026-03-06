// src/middlewares/requireWorkspacePermission.ts

import type { NextFunction, Request, Response } from "express";

import {
    hasAnyWorkspacePermission,
    hasWorkspacePermission,
} from "@/src/shared/security/workspacePermissions";
import type { WorkspacePermission } from "@/src/shared/types/workspacePermissions";

export function requireWorkspacePermission(permission: WorkspacePermission) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const workspace = req.workspace;
        const workspaceMember = req.workspaceMember;

        if (!workspace || !workspaceMember) {
            res.status(403).json({
                code: "WORKSPACE_ACCESS_MISSING",
                message: "Forbidden",
            });
            return;
        }

        const isAllowed = hasWorkspacePermission({
            workspaceKind: workspace.kind,
            role: workspaceMember.role,
            grantedPermissions: workspaceMember.permissions ?? [],
            requiredPermission: permission,
        });

        if (!isAllowed) {
            res.status(403).json({
                code: "WORKSPACE_PERMISSION_FORBIDDEN",
                message: "Forbidden",
            });
            return;
        }

        next();
    };
}

export function requireAnyWorkspacePermission(
    ...permissions: WorkspacePermission[]
) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const workspace = req.workspace;
        const workspaceMember = req.workspaceMember;

        if (!workspace || !workspaceMember) {
            res.status(403).json({
                code: "WORKSPACE_ACCESS_MISSING",
                message: "Forbidden",
            });
            return;
        }

        const isAllowed = hasAnyWorkspacePermission({
            workspaceKind: workspace.kind,
            role: workspaceMember.role,
            grantedPermissions: workspaceMember.permissions ?? [],
            requiredPermissions: permissions,
        });

        if (!isAllowed) {
            res.status(403).json({
                code: "WORKSPACE_PERMISSION_FORBIDDEN",
                message: "Forbidden",
            });
            return;
        }

        next();
    };
}