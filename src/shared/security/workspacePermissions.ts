// src/shared/security/workspacePermissions.ts

import type { MemberRole, WorkspaceKind } from "@/src/shared/types/common";
import type { WorkspacePermission } from "@/src/shared/types/workspacePermissions";

export function isPrivilegedWorkspaceRole(role: MemberRole): boolean {
    return role === "OWNER" || role === "ADMIN";
}

export function hasWorkspacePermission(input: {
    workspaceKind: WorkspaceKind;
    role: MemberRole;
    grantedPermissions?: WorkspacePermission[];
    requiredPermission: WorkspacePermission;
}): boolean {
    if (input.workspaceKind === "INDIVIDUAL") {
        return true;
    }

    if (isPrivilegedWorkspaceRole(input.role)) {
        return true;
    }

    const grantedPermissions = input.grantedPermissions ?? [];

    return grantedPermissions.includes(input.requiredPermission);
}

export function hasAnyWorkspacePermission(input: {
    workspaceKind: WorkspaceKind;
    role: MemberRole;
    grantedPermissions?: WorkspacePermission[];
    requiredPermissions: WorkspacePermission[];
}): boolean {
    if (input.workspaceKind === "INDIVIDUAL") {
        return true;
    }

    if (isPrivilegedWorkspaceRole(input.role)) {
        return true;
    }

    const grantedPermissions = input.grantedPermissions ?? [];

    return input.requiredPermissions.some((permission) =>
        grantedPermissions.includes(permission)
    );
}

export function canManageWorkspaceResources(input: {
    workspaceKind: WorkspaceKind;
    role: MemberRole;
}): boolean {
    if (input.workspaceKind === "INDIVIDUAL") {
        return true;
    }

    return isPrivilegedWorkspaceRole(input.role);
}