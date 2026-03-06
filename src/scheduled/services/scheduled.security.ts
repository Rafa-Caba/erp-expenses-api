// src/scheduled/services/scheduled.security.ts

import mongoose from "mongoose";
import type { Visibility } from "@/src/shared/types/finance";
import type { WorkspaceKind, WorkspaceRole } from "@/src/types/express";
import { canManageWorkspaceResources } from "@/src/shared/security/workspacePermissions";

export type ScheduledAccessContext = {
    actorUserId: string;
    workspaceKind: WorkspaceKind;
    role: WorkspaceRole;
};

export function buildScheduledVisibilityMatchWithRequested(input: {
    actorUserId: string;
    requested?: Visibility;
}) {
    // PRIVATE is truly private: only ownerUserId (even if ADMIN/OWNER)
    if (!input.requested) {
        return {
            $or: [
                { visibility: "SHARED" as const },
                { visibility: "PRIVATE" as const, ownerUserId: new mongoose.Types.ObjectId(input.actorUserId) },
            ],
        };
    }

    if (input.requested === "SHARED") return { visibility: "SHARED" as const };

    return { visibility: "PRIVATE" as const, ownerUserId: new mongoose.Types.ObjectId(input.actorUserId) };
}

export function canMutateScheduledItem(input: {
    access: ScheduledAccessContext;
    visibility: Visibility;
    ownerUserId: string | null;
    createdByUserId: string;
}) {
    const actor = input.access.actorUserId;

    if (input.visibility === "PRIVATE") return input.ownerUserId === actor;

    // SHARED item
    if (input.access.workspaceKind === "INDIVIDUAL") {
        // INDIVIDUAL: "mis cosas"
        if (input.ownerUserId) return input.ownerUserId === actor;
        return input.createdByUserId === actor;
    }

    if (input.createdByUserId === actor) return true;

    return canManageWorkspaceResources({ workspaceKind: input.access.workspaceKind, role: input.access.role });
}

export function canPayOccurrence(input: {
    access: ScheduledAccessContext;
    visibility: Visibility;
    ownerUserId: string | null;
}) {
    const actor = input.access.actorUserId;

    if (input.visibility === "PRIVATE") return input.ownerUserId === actor;
    return true; // SHARED: anyone in workspace can pay/confirm
}

export function assertOwnerRules(visibility: Visibility, ownerUserId: string | null) {
    if (visibility === "PRIVATE" && !ownerUserId) {
        const e = new Error("ownerUserId is required when visibility is PRIVATE");
        (e as { status?: number }).status = 400;
        throw e;
    }
}