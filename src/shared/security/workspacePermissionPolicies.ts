// src/shared/security/workspacePermissionPolicies.ts

import type { MemberRole } from "@/src/shared/types/common";
import type { WorkspacePermission } from "@/src/shared/types/workspacePermissions";
import { getAssignableWorkspacePermissionsForRole } from "@/src/shared/security/workspacePermissionDefaults";

export function canAssignPermissionToRole(input: {
    role: MemberRole;
    permission: WorkspacePermission;
}): boolean {
    const allowedPermissions = getAssignableWorkspacePermissionsForRole(input.role);

    return allowedPermissions.includes(input.permission);
}

export function filterPermissionsAllowedForRole(input: {
    role: MemberRole;
    permissions?: WorkspacePermission[];
}): WorkspacePermission[] {
    if (!input.permissions || input.permissions.length === 0) {
        return [];
    }

    const allowedPermissions = new Set(
        getAssignableWorkspacePermissionsForRole(input.role)
    );

    return input.permissions.filter((permission) => allowedPermissions.has(permission));
}