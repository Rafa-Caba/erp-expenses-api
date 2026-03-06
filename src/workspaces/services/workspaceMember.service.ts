// src/workspaces/services/workspaceMember.service.ts

import { Types } from "mongoose";

import { resolveWorkspacePermissionsForRole } from "@/src/shared/security/workspacePermissionDefaults";
import type { MemberRole } from "@/src/shared/types/common";
import { UserModel } from "@/src/users/models/User.model";

import {
    WorkspaceMemberModel,
    type WorkspaceMemberDocument,
} from "../models/WorkspaceMember.model";
import type {
    CreateWorkspaceMemberServiceInput,
    DeleteWorkspaceMemberServiceInput,
    UpdateWorkspaceMemberServiceInput,
    UpdateWorkspaceMemberStatusServiceInput,
    WorkspaceMemberResponseDto,
} from "../types/workspaceMember.types";

export class WorkspaceMemberServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

function normalizeOptionalString(value?: string): string | null | undefined {
    if (value === undefined) {
        return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
}

function parseOptionalDate(value?: string): Date | null | undefined {
    if (value === undefined) {
        return undefined;
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        throw new WorkspaceMemberServiceError(
            "La fecha proporcionada no es válida.",
            400,
            "INVALID_DATE"
        );
    }

    return parsedDate;
}

function mapWorkspaceMemberToDto(
    member: WorkspaceMemberDocument
): WorkspaceMemberResponseDto {
    return {
        id: member._id.toString(),
        workspaceId: member.workspaceId.toString(),
        userId: member.userId.toString(),
        displayName: member.displayName,
        role: member.role,
        permissions: member.permissions ?? [],
        status: member.status,
        joinedAt: member.joinedAt ?? null,
        invitedByUserId: member.invitedByUserId ? member.invitedByUserId.toString() : null,
        notes: member.notes ?? null,
        isVisible: member.isVisible ?? true,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
    };
}

function assertCanCreateRole(actorRole: MemberRole, targetRole: MemberRole): void {
    if (targetRole === "OWNER") {
        throw new WorkspaceMemberServiceError(
            "No puedes crear otro owner desde este endpoint.",
            400,
            "OWNER_CREATION_NOT_ALLOWED"
        );
    }

    if (actorRole === "ADMIN" && targetRole === "ADMIN") {
        throw new WorkspaceMemberServiceError(
            "Solo el owner puede crear administradores.",
            403,
            "ADMIN_CANNOT_CREATE_ADMIN"
        );
    }
}

function assertCanModifyTarget(
    actorRole: MemberRole,
    targetMember: WorkspaceMemberDocument
): void {
    if (targetMember.role === "OWNER") {
        throw new WorkspaceMemberServiceError(
            "No puedes modificar al owner del workspace.",
            403,
            "OWNER_PROTECTED"
        );
    }

    if (actorRole === "ADMIN" && targetMember.role === "ADMIN") {
        throw new WorkspaceMemberServiceError(
            "Un admin no puede modificar a otro admin.",
            403,
            "ADMIN_CANNOT_MODIFY_ADMIN"
        );
    }
}

function assertCanAssignRole(actorRole: MemberRole, nextRole: MemberRole): void {
    if (nextRole === "OWNER") {
        throw new WorkspaceMemberServiceError(
            "No puedes asignar el rol OWNER desde este endpoint.",
            400,
            "OWNER_ASSIGNMENT_NOT_ALLOWED"
        );
    }

    if (actorRole === "ADMIN" && nextRole === "ADMIN") {
        throw new WorkspaceMemberServiceError(
            "Solo el owner puede asignar el rol ADMIN.",
            403,
            "ADMIN_CANNOT_ASSIGN_ADMIN"
        );
    }
}

export function isWorkspaceMemberServiceError(
    error: Error
): error is WorkspaceMemberServiceError {
    return error instanceof WorkspaceMemberServiceError;
}

export async function getWorkspaceMembersService(
    workspaceId: Types.ObjectId
): Promise<WorkspaceMemberResponseDto[]> {
    const members = await WorkspaceMemberModel.find({ workspaceId }).sort({
        createdAt: 1,
    });

    return members.map(mapWorkspaceMemberToDto);
}

export async function createWorkspaceMemberService(
    input: CreateWorkspaceMemberServiceInput
): Promise<WorkspaceMemberResponseDto> {
    const { workspaceId, invitedByUserId, actorRole, body } = input;

    assertCanCreateRole(actorRole, body.role);

    if (!Types.ObjectId.isValid(body.userId)) {
        throw new WorkspaceMemberServiceError(
            "El userId proporcionado no es válido.",
            400,
            "INVALID_USER_ID"
        );
    }

    const targetUserId = new Types.ObjectId(body.userId);

    const user = await UserModel.findById(targetUserId).select("_id isActive");

    if (!user) {
        throw new WorkspaceMemberServiceError(
            "El usuario indicado no existe.",
            404,
            "TARGET_USER_NOT_FOUND"
        );
    }

    if (!user.isActive) {
        throw new WorkspaceMemberServiceError(
            "El usuario indicado está inactivo.",
            403,
            "TARGET_USER_INACTIVE"
        );
    }

    const existingMember = await WorkspaceMemberModel.findOne({
        workspaceId,
        userId: targetUserId,
    });

    if (existingMember) {
        throw new WorkspaceMemberServiceError(
            "Ese usuario ya pertenece al workspace.",
            409,
            "WORKSPACE_MEMBER_ALREADY_EXISTS"
        );
    }

    const member = await WorkspaceMemberModel.create({
        workspaceId,
        userId: targetUserId,
        displayName: body.displayName.trim(),
        role: body.role,
        permissions: resolveWorkspacePermissionsForRole({
            role: body.role,
            permissions: body.permissions,
        }),
        status: body.status ?? "invited",
        joinedAt: parseOptionalDate(body.joinedAt) ?? null,
        invitedByUserId,
        notes: normalizeOptionalString(body.notes) ?? null,
        isVisible: body.isVisible ?? true,
    });

    return mapWorkspaceMemberToDto(member);
}

export async function updateWorkspaceMemberService(
    input: UpdateWorkspaceMemberServiceInput
): Promise<WorkspaceMemberResponseDto | null> {
    const { workspaceId, actorRole, memberId, body } = input;

    const targetMember = await WorkspaceMemberModel.findOne({
        _id: memberId,
        workspaceId,
    });

    if (!targetMember) {
        return null;
    }

    assertCanModifyTarget(actorRole, targetMember);

    if (body.role !== undefined) {
        assertCanAssignRole(actorRole, body.role);
    }

    if (body.displayName !== undefined) {
        targetMember.displayName = body.displayName.trim();
    }

    if (body.role !== undefined) {
        targetMember.role = body.role;
    }

    if (body.permissions !== undefined) {
        targetMember.permissions = resolveWorkspacePermissionsForRole({
            role: body.role ?? targetMember.role,
            permissions: body.permissions,
            useRecommendedWhenEmpty: false,
        });
    }

    if (body.notes !== undefined) {
        targetMember.notes = normalizeOptionalString(body.notes) ?? null;
    }

    if (body.isVisible !== undefined) {
        targetMember.isVisible = body.isVisible;
    }

    await targetMember.save();

    return mapWorkspaceMemberToDto(targetMember);
}

export async function updateWorkspaceMemberStatusService(
    input: UpdateWorkspaceMemberStatusServiceInput
): Promise<WorkspaceMemberResponseDto | null> {
    const { workspaceId, actorRole, memberId, body } = input;

    const targetMember = await WorkspaceMemberModel.findOne({
        _id: memberId,
        workspaceId,
    });

    if (!targetMember) {
        return null;
    }

    assertCanModifyTarget(actorRole, targetMember);

    targetMember.status = body.status;

    const parsedJoinedAt = parseOptionalDate(body.joinedAt);

    if (parsedJoinedAt !== undefined) {
        targetMember.joinedAt = parsedJoinedAt;
    } else if (body.status === "active" && !targetMember.joinedAt) {
        targetMember.joinedAt = new Date();
    }

    await targetMember.save();

    return mapWorkspaceMemberToDto(targetMember);
}

export async function deleteWorkspaceMemberService(
    input: DeleteWorkspaceMemberServiceInput
): Promise<WorkspaceMemberResponseDto | null> {
    const { workspaceId, actorRole, memberId } = input;

    const targetMember = await WorkspaceMemberModel.findOne({
        _id: memberId,
        workspaceId,
    });

    if (!targetMember) {
        return null;
    }

    assertCanModifyTarget(actorRole, targetMember);

    await WorkspaceMemberModel.deleteOne({
        _id: targetMember._id,
    });

    return mapWorkspaceMemberToDto(targetMember);
}