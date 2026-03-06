// src/shared/security/visibility.ts

import { Types } from "mongoose";

import { isPrivilegedWorkspaceRole } from "@/src/shared/security/workspacePermissions";
import type { MemberRole, WorkspaceKind } from "@/src/shared/types/common";
import type { Visibility } from "@/src/shared/types/finance";

type VisibilityContext = {
    workspaceKind: WorkspaceKind;
    role: MemberRole;
    actorUserId: string;
};

export function buildVisibilityMatch(ctx: VisibilityContext) {
    if (ctx.workspaceKind === "INDIVIDUAL") {
        return {};
    }

    if (isPrivilegedWorkspaceRole(ctx.role)) {
        return {};
    }

    return {
        $or: [
            { visibility: "SHARED" satisfies Visibility },
            {
                visibility: "PRIVATE" satisfies Visibility,
                createdByUserId: new Types.ObjectId(ctx.actorUserId),
            },
        ],
    };
}

export function buildVisibilityMatchWithRequested(
    ctx: VisibilityContext,
    requested?: Visibility
) {
    if (ctx.workspaceKind === "INDIVIDUAL" || isPrivilegedWorkspaceRole(ctx.role)) {
        return requested ? { visibility: requested } : {};
    }

    if (!requested) {
        return buildVisibilityMatch(ctx);
    }

    if (requested === "SHARED") {
        return { visibility: "SHARED" satisfies Visibility };
    }

    return {
        visibility: "PRIVATE" satisfies Visibility,
        createdByUserId: new Types.ObjectId(ctx.actorUserId),
    };
}

export function canMutateEntity(
    ctx: VisibilityContext,
    createdByUserId: string
): boolean {
    if (isPrivilegedWorkspaceRole(ctx.role)) {
        return true;
    }

    return createdByUserId === ctx.actorUserId;
}