// src/shared/security/workspacePermissionSeed.ts

import { getRecommendedWorkspacePermissionsByRole } from "@/src/shared/security/workspacePermissionDefaults";
import type { MemberRole } from "@/src/shared/types/common";

const memberRoles: MemberRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

export function buildWorkspacePermissionSeedPreview() {
    return memberRoles.map((role) => ({
        role,
        permissions: getRecommendedWorkspacePermissionsByRole(role),
    }));
}