// src/workspaces/services/workspaces.service.ts

import { Types } from "mongoose";

import type { WorkspacePermission } from "@/src/shared/types/workspacePermissions";
import { createDefaultWorkspaceSettingsService } from "@/src/workspaceSettings/services/workspaceSettings.service";
import { ensureDefaultThemesForWorkspaceService } from "@/src/themes/services/theme.service";

import { WorkspaceModel, type WorkspaceDocument } from "../models/Workspace.model";
import { WorkspaceMemberModel } from "../models/WorkspaceMember.model";
import type {
    CreateWorkspaceServiceInput,
    UpdateWorkspaceServiceInput,
    WorkspaceListItemDto,
    WorkspaceQueryOptions,
    WorkspaceResponseDto,
} from "../types/workspace.types";

function normalizeOptionalString(value?: string): string | undefined {
    if (value === undefined) {
        return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function mapWorkspaceToDto(workspace: WorkspaceDocument): WorkspaceResponseDto {
    return {
        id: workspace._id.toString(),
        type: workspace.type,
        kind: workspace.kind,
        name: workspace.name,
        description: workspace.description ?? null,
        ownerUserId: workspace.ownerUserId.toString(),
        currency: workspace.currency,
        timezone: workspace.timezone,
        country: workspace.country ?? null,
        icon: workspace.icon ?? null,
        color: workspace.color ?? null,
        visibility: workspace.visibility,
        isActive: workspace.isActive,
        isArchived: workspace.isArchived ?? false,
        isVisible: workspace.isVisible ?? true,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
    };
}

async function createOwnerMembership(
    workspaceId: Types.ObjectId,
    ownerUserId: Types.ObjectId,
    displayName: string
): Promise<void> {
    await WorkspaceMemberModel.create({
        workspaceId,
        userId: ownerUserId,
        displayName,
        role: "OWNER",
        status: "active",
        joinedAt: new Date(),
        isVisible: true,
    });
}

function dedupeObjectIds(ids: Types.ObjectId[]): Types.ObjectId[] {
    const seen = new Set<string>();
    const result: Types.ObjectId[] = [];

    for (const id of ids) {
        const key = id.toString();

        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        result.push(id);
    }

    return result;
}

async function getWorkspaceIdsForUserPermission(
    userId: Types.ObjectId,
    permission: WorkspacePermission
): Promise<Types.ObjectId[]> {
    const memberships = await WorkspaceMemberModel.find({
        userId,
        permissions: permission,
    }).select("workspaceId");

    const workspaceIds = memberships.flatMap((membership) => {
        if (!membership.workspaceId) {
            return [];
        }

        return [membership.workspaceId];
    });

    return dedupeObjectIds(workspaceIds);
}

async function getWorkspaceMemberCountMap(
    workspaceIds: Types.ObjectId[]
): Promise<Map<string, number>> {
    if (workspaceIds.length === 0) {
        return new Map<string, number>();
    }

    const memberCountsRaw = await WorkspaceMemberModel.aggregate<{
        _id: Types.ObjectId;
        count: number;
    }>([
        {
            $match: {
                workspaceId: { $in: workspaceIds },
            },
        },
        {
            $group: {
                _id: "$workspaceId",
                count: { $sum: 1 },
            },
        },
    ]);

    return new Map<string, number>(
        memberCountsRaw.map((item) => [item._id.toString(), item.count])
    );
}

async function findWorkspaceForOwnerOrPermission(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    permission: WorkspacePermission
): Promise<WorkspaceDocument | null> {
    const ownedWorkspace = await WorkspaceModel.findOne({
        _id: workspaceId,
        ownerUserId: userId,
    });

    if (ownedWorkspace) {
        return ownedWorkspace;
    }

    const membership = await WorkspaceMemberModel.findOne({
        workspaceId,
        userId,
        permissions: permission,
    }).select("_id");

    if (!membership) {
        return null;
    }

    const workspace = await WorkspaceModel.findById(workspaceId);

    if (!workspace) {
        return null;
    }

    return workspace;
}

export async function createWorkspaceService(
    input: CreateWorkspaceServiceInput
): Promise<WorkspaceResponseDto> {
    const { ownerUserId, body } = input;

    const workspace = await WorkspaceModel.create({
        type: body.type,
        kind: body.kind ?? (body.type === "PERSONAL" ? "INDIVIDUAL" : "COLLABORATIVE"),
        name: body.name.trim(),
        description: normalizeOptionalString(body.description),
        ownerUserId,
        currency: body.currency,
        timezone: body.timezone.trim(),
        country: normalizeOptionalString(body.country),
        icon: normalizeOptionalString(body.icon),
        color: normalizeOptionalString(body.color),
        visibility: body.visibility ?? "PRIVATE",
        isActive: true,
        isArchived: false,
        isVisible: body.isVisible ?? true,
    });

    await createOwnerMembership(workspace._id, ownerUserId, body.name.trim());

    await createDefaultWorkspaceSettingsService({
        workspaceId: workspace._id,
        currency: body.currency,
        timezone: body.timezone.trim(),
    });

    await ensureDefaultThemesForWorkspaceService(workspace._id);

    return mapWorkspaceToDto(workspace);
}

export async function getWorkspacesService(
    options: WorkspaceQueryOptions
): Promise<WorkspaceListItemDto[]> {
    const ownerQuery: {
        ownerUserId: Types.ObjectId;
        isArchived?: boolean;
        isActive?: boolean;
    } = {
        ownerUserId: options.ownerUserId,
    };

    if (!options.includeArchived) {
        ownerQuery.isArchived = false;
    }

    if (!options.includeInactive) {
        ownerQuery.isActive = true;
    }

    const [ownedWorkspaces, readableWorkspaceIds] = await Promise.all([
        WorkspaceModel.find(ownerQuery),
        getWorkspaceIdsForUserPermission(options.ownerUserId, "workspace.read"),
    ]);

    const ownedWorkspaceIdSet = new Set<string>(
        ownedWorkspaces.map((workspace) => workspace._id.toString())
    );

    const memberWorkspaceIds = readableWorkspaceIds.filter(
        (workspaceId) => !ownedWorkspaceIdSet.has(workspaceId.toString())
    );

    const memberWorkspaceQuery: {
        _id: { $in: Types.ObjectId[] };
        isArchived?: boolean;
        isActive?: boolean;
    } = {
        _id: { $in: memberWorkspaceIds },
    };

    if (!options.includeArchived) {
        memberWorkspaceQuery.isArchived = false;
    }

    if (!options.includeInactive) {
        memberWorkspaceQuery.isActive = true;
    }

    const memberWorkspaces =
        memberWorkspaceIds.length > 0
            ? await WorkspaceModel.find(memberWorkspaceQuery)
            : [];

    const workspaces = [...ownedWorkspaces, ...memberWorkspaces].sort(
        (leftWorkspace, rightWorkspace) =>
            rightWorkspace.createdAt.getTime() - leftWorkspace.createdAt.getTime()
    );

    const memberCountMap = await getWorkspaceMemberCountMap(
        workspaces.map((workspace) => workspace._id)
    );

    return workspaces.map((workspace) => ({
        ...mapWorkspaceToDto(workspace),
        memberCount: memberCountMap.get(workspace._id.toString()) ?? 0,
    }));
}

export async function getWorkspaceByIdService(
    workspaceId: Types.ObjectId,
    ownerUserId: Types.ObjectId
): Promise<WorkspaceResponseDto | null> {
    const workspace = await findWorkspaceForOwnerOrPermission(
        workspaceId,
        ownerUserId,
        "workspace.read"
    );

    if (!workspace) {
        return null;
    }

    return mapWorkspaceToDto(workspace);
}

export async function updateWorkspaceService(
    input: UpdateWorkspaceServiceInput
): Promise<WorkspaceResponseDto | null> {
    const { workspaceId, ownerUserId, body } = input;

    const accessibleWorkspace = await findWorkspaceForOwnerOrPermission(
        workspaceId,
        ownerUserId,
        "workspace.update"
    );

    if (!accessibleWorkspace) {
        return null;
    }

    const updatePayload: Partial<WorkspaceDocument> = {};

    if (body.type !== undefined) {
        updatePayload.type = body.type;
    }

    if (body.kind !== undefined) {
        updatePayload.kind = body.kind;
    }

    if (body.name !== undefined) {
        updatePayload.name = body.name.trim();
    }

    if (body.description !== undefined) {
        updatePayload.description = normalizeOptionalString(body.description) ?? null;
    }

    if (body.currency !== undefined) {
        updatePayload.currency = body.currency;
    }

    if (body.timezone !== undefined) {
        updatePayload.timezone = body.timezone.trim();
    }

    if (body.country !== undefined) {
        updatePayload.country = normalizeOptionalString(body.country) ?? null;
    }

    if (body.icon !== undefined) {
        updatePayload.icon = normalizeOptionalString(body.icon) ?? null;
    }

    if (body.color !== undefined) {
        updatePayload.color = normalizeOptionalString(body.color) ?? null;
    }

    if (body.visibility !== undefined) {
        updatePayload.visibility = body.visibility;
    }

    if (body.isActive !== undefined) {
        updatePayload.isActive = body.isActive;
    }

    if (body.isArchived !== undefined) {
        updatePayload.isArchived = body.isArchived;
    }

    if (body.isVisible !== undefined) {
        updatePayload.isVisible = body.isVisible;
    }

    const workspace = await WorkspaceModel.findByIdAndUpdate(
        accessibleWorkspace._id,
        updatePayload,
        {
            new: true,
            runValidators: true,
        }
    );

    if (!workspace) {
        return null;
    }

    return mapWorkspaceToDto(workspace);
}

export async function archiveWorkspaceService(
    workspaceId: Types.ObjectId,
    ownerUserId: Types.ObjectId
): Promise<WorkspaceResponseDto | null> {
    const accessibleWorkspace = await findWorkspaceForOwnerOrPermission(
        workspaceId,
        ownerUserId,
        "workspace.archive"
    );

    if (!accessibleWorkspace) {
        return null;
    }

    const workspace = await WorkspaceModel.findByIdAndUpdate(
        accessibleWorkspace._id,
        {
            isArchived: true,
            isActive: false,
        },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!workspace) {
        return null;
    }

    return mapWorkspaceToDto(workspace);
}