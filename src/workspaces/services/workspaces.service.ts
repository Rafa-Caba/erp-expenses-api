// src/workspaces/services/workspaces.service.ts

import { Types } from "mongoose";

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
    const query: Record<string, boolean | Types.ObjectId> = {
        ownerUserId: options.ownerUserId,
    };

    if (!options.includeArchived) {
        query.isArchived = false;
    }

    if (!options.includeInactive) {
        query.isActive = true;
    }

    const workspaces = await WorkspaceModel.find(query).sort({ createdAt: -1 });

    const workspaceIds = workspaces.map((workspace) => workspace._id);

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

    const memberCountMap = new Map<string, number>(
        memberCountsRaw.map((item) => [item._id.toString(), item.count])
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
    const workspace = await WorkspaceModel.findOne({
        _id: workspaceId,
        ownerUserId,
    });

    if (!workspace) {
        return null;
    }

    return mapWorkspaceToDto(workspace);
}

export async function updateWorkspaceService(
    input: UpdateWorkspaceServiceInput
): Promise<WorkspaceResponseDto | null> {
    const { workspaceId, ownerUserId, body } = input;

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

    const workspace = await WorkspaceModel.findOneAndUpdate(
        {
            _id: workspaceId,
            ownerUserId,
        },
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
    const workspace = await WorkspaceModel.findOneAndUpdate(
        {
            _id: workspaceId,
            ownerUserId,
        },
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