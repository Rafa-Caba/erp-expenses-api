// src/shared/security/workspacePermissions.ts

import type { WorkspaceKind, WorkspaceRole } from "@/src/types/express";
import { isPrivilegedRole } from "@/src/shared/security/visibility";

export function canManageWorkspaceResources(input: {
    workspaceKind: WorkspaceKind;
    role: WorkspaceRole;
}): boolean {
    // INDIVIDUAL: only owner exists (or should), allow.
    if (input.workspaceKind === "INDIVIDUAL") return true;

    // SHARED: only OWNER/ADMIN can mutate resources.
    return isPrivilegedRole(input.role);
}