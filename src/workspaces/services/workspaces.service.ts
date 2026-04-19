import { Types } from "mongoose";

import type { WorkspacePermission } from "@/src/shared/types/workspacePermissions";
import { createDefaultWorkspaceSettingsService } from "@/src/workspaceSettings/services/workspaceSettings.service";
import { ensureDefaultThemesForWorkspaceService } from "@/src/themes/services/theme.service";

import { WorkspaceModel, type WorkspaceDocument } from "../models/Workspace.model";
import { WorkspaceMemberModel } from "../models/WorkspaceMember.model";
import type {
    CreateWorkspaceServiceInput,
    UpdateWorkspaceServiceInput,
    WorkspaceCurrentMembershipDto,
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

function mapCurrentMembershipToDto(membership: {
    _id: Types.ObjectId;
    role: WorkspaceCurrentMembershipDto["role"];
    status: WorkspaceCurrentMembershipDto["status"];
} | null): WorkspaceCurrentMembershipDto | null {
    if (!membership) {
        return null;
    }

    return {
        memberId: membership._id.toString(),
        role: membership.role,
        status: membership.status,
    };
}

function mapWorkspaceToDto(
    workspace: WorkspaceDocument,
    currentMembership: WorkspaceCurrentMembershipDto | null = null
): WorkspaceResponseDto {
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
        currentMembership,
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
        permissions: [],
        status: "active",
        joinedAt: new Date(),
        invitedByUserId: ownerUserId,
        notes: null,
        isVisible: true,
    });
}

async function getWorkspaceIdsForUserPermission(
    userId: Types.ObjectId,
    permission: WorkspacePermission
): Promise<Types.ObjectId[]> {
    const memberships = await WorkspaceMemberModel.find({
        userId,
        status: "active",
        permissions: permission,
    }).select("workspaceId");

    return memberships.map((membership) => membership.workspaceId);
}

async function getWorkspaceMemberCountMap(
    workspaceIds: Types.ObjectId[]
): Promise<Map<string, number>> {
    if (workspaceIds.length === 0) {
        return new Map<string, number>();
    }

    const rows = await WorkspaceMemberModel.aggregate<{
        _id: Types.ObjectId;
        count: number;
    }>([
        {
            $match: {
                workspaceId: { $in: workspaceIds },
                status: "active",
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
        rows.map((row) => [row._id.toString(), row.count])
    );
}

async function getCurrentMembershipMap(
    workspaceIds: Types.ObjectId[],
    userId: Types.ObjectId
): Promise<Map<string, WorkspaceCurrentMembershipDto>> {
    if (workspaceIds.length === 0) {
        return new Map<string, WorkspaceCurrentMembershipDto>();
    }

    const memberships = await WorkspaceMemberModel.find({
        workspaceId: { $in: workspaceIds },
        userId,
    }).select("_id workspaceId role status");

    return new Map<string, WorkspaceCurrentMembershipDto>(
        memberships.map((membership) => [
            membership.workspaceId.toString(),
            {
                memberId: membership._id.toString(),
                role: membership.role,
                status: membership.status,
            },
        ])
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

    return mapWorkspaceToDto(workspace, {
        memberId: "",
        role: "OWNER",
        status: "active",
    });
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

    const workspaceIds = workspaces.map((workspace) => workspace._id);

    const [memberCountMap, currentMembershipMap] = await Promise.all([
        getWorkspaceMemberCountMap(workspaceIds),
        getCurrentMembershipMap(workspaceIds, options.ownerUserId),
    ]);

    return workspaces.map((workspace) => ({
        ...mapWorkspaceToDto(
            workspace,
            currentMembershipMap.get(workspace._id.toString()) ?? null
        ),
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

    const membership = await WorkspaceMemberModel.findOne({
        workspaceId: workspace._id,
        userId: ownerUserId,
    }).select("_id role status");

    return mapWorkspaceToDto(
        workspace,
        mapCurrentMembershipToDto(
            membership
                ? {
                    _id: membership._id,
                    role: membership.role,
                    status: membership.status,
                }
                : null
        )
    );
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

    const membership = await WorkspaceMemberModel.findOne({
        workspaceId: workspace._id,
        userId: ownerUserId,
    }).select("_id role status");

    return mapWorkspaceToDto(
        workspace,
        mapCurrentMembershipToDto(
            membership
                ? {
                    _id: membership._id,
                    role: membership.role,
                    status: membership.status,
                }
                : null
        )
    );
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

    const membership = await WorkspaceMemberModel.findOne({
        workspaceId: workspace._id,
        userId: ownerUserId,
    }).select("_id role status");

    return mapWorkspaceToDto(
        workspace,
        mapCurrentMembershipToDto(
            membership
                ? {
                    _id: membership._id,
                    role: membership.role,
                    status: membership.status,
                }
                : null
        )
    );
}