// src/shared/security/visibility.ts

import mongoose from "mongoose";
import type { Visibility } from "@/src/shared/types/finance";
import type { WorkspaceKind, WorkspaceRole } from "@/src/types/express";

type VisibilityContext = {
    workspaceKind: WorkspaceKind;
    role: WorkspaceRole;
    actorUserId: string;
};

export function isPrivilegedRole(role: WorkspaceRole): boolean {
    return role === "OWNER" || role === "ADMIN";
}

export function buildVisibilityMatch(ctx: VisibilityContext) {
    // INDIVIDUAL: only owner exists (enforced by membership).
    if (ctx.workspaceKind === "INDIVIDUAL") return {};

    // SHARED privileged: can see all
    if (isPrivilegedRole(ctx.role)) return {};

    // Non-privileged in SHARED: SHARED + own PRIVATE
    return {
        $or: [
            { visibility: "SHARED" satisfies Visibility },
            {
                visibility: "PRIVATE" satisfies Visibility,
                createdByUserId: new mongoose.Types.ObjectId(ctx.actorUserId),
            },
        ],
    };
}

export function buildVisibilityMatchWithRequested(ctx: VisibilityContext, requested?: Visibility) {
    // Privileged or INDIVIDUAL: allow requested filter as-is
    if (ctx.workspaceKind === "INDIVIDUAL" || isPrivilegedRole(ctx.role)) {
        return requested ? { visibility: requested } : {};
    }

    // Non-privileged in SHARED
    if (!requested) return buildVisibilityMatch(ctx);

    if (requested === "SHARED") {
        return { visibility: "SHARED" satisfies Visibility };
    }

    // requested === PRIVATE => only own private
    return {
        visibility: "PRIVATE" satisfies Visibility,
        createdByUserId: new mongoose.Types.ObjectId(ctx.actorUserId),
    };
}

/**
 * Mutation rule:
 * - OWNER/ADMIN can mutate any tx in SHARED.
 * - MEMBER/VIEWER can mutate only transactions they created.
 * - INDIVIDUAL: only owner exists, but keep rule consistent.
 */
export function canMutateEntity(ctx: VisibilityContext, createdByUserId: string): boolean {
    if (isPrivilegedRole(ctx.role)) return true;
    return createdByUserId === ctx.actorUserId;
}