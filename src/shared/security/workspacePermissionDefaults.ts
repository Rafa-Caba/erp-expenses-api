// src/shared/security/workspacePermissionDefaults.ts

import type { MemberRole } from "@/src/shared/types/common";
import type { WorkspacePermission } from "@/src/shared/types/workspacePermissions";
import { workspacePermissionValues } from "@/src/shared/types/workspacePermissions";

const allWorkspacePermissions: WorkspacePermission[] = [...workspacePermissionValues];

const ownerPermissions: WorkspacePermission[] = [...allWorkspacePermissions];

const adminPermissions: WorkspacePermission[] = [...allWorkspacePermissions];

const memberPermissions: WorkspacePermission[] = [
    "workspace.read",

    "accounts.read",
    "accounts.create",
    "accounts.update",

    "categories.read",

    "transactions.read",
    "transactions.create",
    "transactions.update",

    "budgets.read",

    "debts.read",
    "debts.create",
    "debts.update",
    "debts.pay",
];

const viewerPermissions: WorkspacePermission[] = [
    "workspace.read",

    "accounts.read",
    "categories.read",
    "transactions.read",
    "budgets.read",
    "debts.read",
];

const recommendedPermissionsByRole: Record<MemberRole, WorkspacePermission[]> = {
    OWNER: ownerPermissions,
    ADMIN: adminPermissions,
    MEMBER: memberPermissions,
    VIEWER: viewerPermissions,
};

export function getRecommendedWorkspacePermissionsByRole(
    role: MemberRole
): WorkspacePermission[] {
    return [...recommendedPermissionsByRole[role]];
}

export function getAllWorkspacePermissions(): WorkspacePermission[] {
    return [...allWorkspacePermissions];
}

export function getAssignableWorkspacePermissionsForRole(
    role: MemberRole
): WorkspacePermission[] {
    return [...recommendedPermissionsByRole[role]];
}

export function normalizeWorkspacePermissions(
    permissions?: WorkspacePermission[]
): WorkspacePermission[] {
    if (!permissions || permissions.length === 0) {
        return [];
    }

    return Array.from(new Set(permissions));
}

export function resolveWorkspacePermissionsForRole(input: {
    role: MemberRole;
    permissions?: WorkspacePermission[];
    useRecommendedWhenEmpty?: boolean;
}): WorkspacePermission[] {
    const normalizedPermissions = normalizeWorkspacePermissions(input.permissions);

    if (normalizedPermissions.length > 0) {
        return normalizedPermissions;
    }

    if (input.useRecommendedWhenEmpty === false) {
        return [];
    }

    return getRecommendedWorkspacePermissionsByRole(input.role);
}