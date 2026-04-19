// src/reminders/services/reminders.service.ts

import { Types } from "mongoose";

import type { MemberRole } from "@/src/shared/types/common";
import { WorkspaceMemberModel } from "@/src/workspaces/models/WorkspaceMember.model";
import { ReminderModel } from "../models/Reminder.model";
import type {
    CreateReminderServiceInput,
    DeleteReminderServiceInput,
    ReminderDocument,
    ReminderMemberResponse,
    ReminderMemberResponseStatus,
    ReminderRelatedEntityType,
    ReminderStatus,
    RespondToReminderBody,
    UpdateReminderServiceInput,
} from "../types/reminders.types";

type OptionalObjectId = Types.ObjectId | null;
type NullableString = string | null;

export interface ReminderResponseDto extends ReminderDocument {
    isOverdue: boolean;
    responseSummary: {
        totalRecipients: number;
        totalViewed: number;
        totalPending: number;
        totalDone: number;
        totalDismissed: number;
        totalResponded: number;
    };
}

export class ReminderServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.name = "ReminderServiceError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

export function isReminderServiceError(error: Error): error is ReminderServiceError {
    return error instanceof ReminderServiceError;
}

function normalizeNullableString(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}

function parseOptionalObjectId(value: string | null | undefined): OptionalObjectId {
    if (value === undefined || value === null) {
        return null;
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
        return null;
    }

    if (!Types.ObjectId.isValid(normalizedValue)) {
        throw new ReminderServiceError(
            "Uno de los ids enviados no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(normalizedValue);
}

function parseRelatedEntityId(
    relatedEntityType: ReminderRelatedEntityType | null | undefined,
    value: string | null | undefined
): NullableString {
    const normalizedValue = normalizeNullableString(value);

    if (!normalizedValue) {
        return null;
    }

    if (relatedEntityType === "custom") {
        return normalizedValue;
    }

    if (!Types.ObjectId.isValid(normalizedValue)) {
        throw new ReminderServiceError(
            "Uno de los ids enviados no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return normalizedValue;
}

function parseRequiredDate(value: string): Date {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        throw new ReminderServiceError(
            "La fecha del recordatorio no es válida.",
            400,
            "INVALID_DUE_DATE"
        );
    }

    return parsedDate;
}

function normalizeRecurrenceRule(
    isRecurring: boolean,
    recurrenceRule: string | null | undefined
): string | null {
    if (!isRecurring) {
        return null;
    }

    const normalizedValue = normalizeNullableString(recurrenceRule);

    if (!normalizedValue) {
        throw new ReminderServiceError(
            "La regla de recurrencia es obligatoria cuando el recordatorio es recurrente.",
            400,
            "MISSING_RECURRENCE_RULE"
        );
    }

    return normalizedValue;
}

function validateRelatedEntityFields(
    relatedEntityType: ReminderRelatedEntityType | null | undefined,
    relatedEntityId: NullableString
): void {
    const hasRelatedEntityType =
        relatedEntityType !== undefined && relatedEntityType !== null;
    const hasRelatedEntityId =
        relatedEntityId !== null && relatedEntityId.trim().length > 0;

    if (hasRelatedEntityType !== hasRelatedEntityId) {
        throw new ReminderServiceError(
            "relatedEntityType y relatedEntityId deben enviarse juntos.",
            400,
            "INVALID_RELATED_ENTITY_PAIR"
        );
    }
}

async function validateMemberExistsInWorkspace(
    workspaceId: Types.ObjectId,
    memberId: Types.ObjectId
): Promise<void> {
    const member = await WorkspaceMemberModel.exists({
        _id: memberId,
        workspaceId,
        status: "active",
    });

    if (!member) {
        throw new ReminderServiceError(
            "El miembro no fue encontrado en el workspace.",
            400,
            "WORKSPACE_MEMBER_NOT_FOUND"
        );
    }
}

async function getActiveWorkspaceMemberIds(
    workspaceId: Types.ObjectId
): Promise<Types.ObjectId[]> {
    const members = await WorkspaceMemberModel.find(
        {
            workspaceId,
            status: "active",
        },
        {
            _id: 1,
        }
    ).lean<{ _id: Types.ObjectId }[]>();

    return members.map((member) => member._id);
}

function buildInitialResponses(memberIds: Types.ObjectId[]): ReminderMemberResponse[] {
    return memberIds.map((memberId) => ({
        memberId,
        status: "pending",
        viewedAt: null,
        respondedAt: null,
    }));
}

function mergeResponsesForRecipients(
    recipientMemberIds: Types.ObjectId[],
    existingResponses: ReminderMemberResponse[]
): ReminderMemberResponse[] {
    const existingResponseMap = new Map<string, ReminderMemberResponse>();

    for (const response of existingResponses) {
        existingResponseMap.set(response.memberId.toString(), response);
    }

    return recipientMemberIds.map((memberId) => {
        const existingResponse = existingResponseMap.get(memberId.toString());

        if (existingResponse) {
            return {
                memberId,
                status: existingResponse.status,
                viewedAt: existingResponse.viewedAt ?? null,
                respondedAt: existingResponse.respondedAt ?? null,
            };
        }

        return {
            memberId,
            status: "pending",
            viewedAt: null,
            respondedAt: null,
        };
    });
}

function computeReminderStatusFromResponses(
    responses: ReminderMemberResponse[]
): ReminderStatus {
    const respondedCount = responses.filter(
        (response) => response.status !== "pending"
    ).length;

    if (respondedCount === 0) {
        return "pending";
    }

    if (respondedCount < responses.length) {
        return "in_progress";
    }

    return "resolved";
}

function buildReminderResponse(reminder: ReminderDocument): ReminderResponseDto {
    const totalRecipients = reminder.recipientMemberIds.length;
    const totalViewed = reminder.responses.filter(
        (response) => response.viewedAt !== null
    ).length;
    const totalPending = reminder.responses.filter(
        (response) => response.status === "pending"
    ).length;
    const totalDone = reminder.responses.filter(
        (response) => response.status === "done"
    ).length;
    const totalDismissed = reminder.responses.filter(
        (response) => response.status === "dismissed"
    ).length;
    const totalResponded = totalDone + totalDismissed;

    const isOverdue =
        reminder.status !== "resolved" && reminder.dueDate.getTime() < Date.now();

    return {
        ...reminder,
        description: reminder.description ?? null,
        relatedEntityType: reminder.relatedEntityType ?? null,
        relatedEntityId: reminder.relatedEntityId ?? null,
        recurrenceRule: reminder.recurrenceRule ?? null,
        priority: reminder.priority ?? null,
        isVisible: reminder.isVisible ?? true,
        isOverdue,
        responseSummary: {
            totalRecipients,
            totalViewed,
            totalPending,
            totalDone,
            totalDismissed,
            totalResponded,
        },
    };
}

async function findReminderById(
    workspaceId: Types.ObjectId,
    reminderId: Types.ObjectId,
    actorWorkspaceMemberId?: Types.ObjectId,
    actorWorkspaceMemberRole?: MemberRole
): Promise<ReminderDocument | null> {
    if (!actorWorkspaceMemberId) {
        return ReminderModel.findOne({
            _id: reminderId,
            workspaceId,
        }).lean<ReminderDocument | null>();
    }

    if (actorWorkspaceMemberRole === "OWNER") {
        return ReminderModel.findOne({
            _id: reminderId,
            workspaceId,
        }).lean<ReminderDocument | null>();
    }

    return ReminderModel.findOne({
        _id: reminderId,
        workspaceId,
        $or: [
            { createdByMemberId: actorWorkspaceMemberId },
            { recipientMemberIds: actorWorkspaceMemberId },
        ],
    }).lean<ReminderDocument | null>();
}

async function resolveRecipientMemberIds(
    workspaceId: Types.ObjectId,
    targetMemberId: OptionalObjectId
): Promise<Types.ObjectId[]> {
    if (targetMemberId) {
        await validateMemberExistsInWorkspace(workspaceId, targetMemberId);
        return [targetMemberId];
    }

    const memberIds = await getActiveWorkspaceMemberIds(workspaceId);

    if (memberIds.length === 0) {
        throw new ReminderServiceError(
            "No hay miembros activos en el workspace para asignar el recordatorio.",
            400,
            "WORKSPACE_HAS_NO_ACTIVE_MEMBERS"
        );
    }

    return memberIds;
}

function ensureMemberCanInteractWithReminder(
    reminder: ReminderDocument,
    workspaceMemberId: Types.ObjectId
): ReminderMemberResponse {
    const currentResponse = reminder.responses.find(
        (response) => response.memberId.toString() === workspaceMemberId.toString()
    );

    if (!currentResponse) {
        throw new ReminderServiceError(
            "No tienes acceso a este recordatorio.",
            403,
            "REMINDER_ACCESS_DENIED"
        );
    }

    return currentResponse;
}

function ensureReminderCanBeManagedByActor(
    reminder: ReminderDocument,
    actorWorkspaceMemberId: Types.ObjectId,
    actorWorkspaceMemberRole: MemberRole
): void {
    if (actorWorkspaceMemberRole === "OWNER") {
        return;
    }

    if (reminder.createdByMemberId.toString() === actorWorkspaceMemberId.toString()) {
        return;
    }

    throw new ReminderServiceError(
        "No tienes permisos para editar o eliminar este recordatorio.",
        403,
        "REMINDER_MANAGE_FORBIDDEN"
    );
}

export async function getRemindersService(
    workspaceId: Types.ObjectId,
    workspaceMemberId: Types.ObjectId,
    workspaceMemberRole: MemberRole
): Promise<ReminderResponseDto[]> {
    const query =
        workspaceMemberRole === "OWNER"
            ? { workspaceId }
            : {
                workspaceId,
                $or: [
                    { createdByMemberId: workspaceMemberId },
                    { recipientMemberIds: workspaceMemberId },
                ],
            };

    const reminders = await ReminderModel.find(query)
        .sort({
            dueDate: 1,
            createdAt: -1,
        })
        .lean<ReminderDocument[]>();

    return reminders.map((reminder) => buildReminderResponse(reminder));
}

export async function getReminderByIdService(
    workspaceId: Types.ObjectId,
    reminderId: Types.ObjectId,
    workspaceMemberId: Types.ObjectId,
    workspaceMemberRole: MemberRole
): Promise<ReminderResponseDto | null> {
    const reminder = await findReminderById(
        workspaceId,
        reminderId,
        workspaceMemberId,
        workspaceMemberRole
    );

    if (!reminder) {
        return null;
    }

    return buildReminderResponse(reminder);
}

export async function createReminderService(
    input: CreateReminderServiceInput
): Promise<ReminderResponseDto> {
    const { workspaceId, body, actor } = input;

    const targetMemberId = parseOptionalObjectId(body.targetMemberId);
    const relatedEntityType = body.relatedEntityType ?? null;
    const relatedEntityId = parseRelatedEntityId(
        relatedEntityType,
        body.relatedEntityId
    );
    const dueDate = parseRequiredDate(body.dueDate);
    const isRecurring = body.isRecurring;
    const recurrenceRule = normalizeRecurrenceRule(isRecurring, body.recurrenceRule);

    validateRelatedEntityFields(relatedEntityType, relatedEntityId);

    const recipientMemberIds = await resolveRecipientMemberIds(
        workspaceId,
        targetMemberId
    );
    const responses = buildInitialResponses(recipientMemberIds);
    const status = computeReminderStatusFromResponses(responses);

    const reminder = await ReminderModel.create({
        workspaceId,
        createdByMemberId: actor.workspaceMemberId,
        recipientMemberIds,
        title: body.title.trim(),
        description: normalizeNullableString(body.description),
        type: body.type,
        relatedEntityType,
        relatedEntityId,
        dueDate,
        isRecurring,
        recurrenceRule,
        status,
        responses,
        priority: body.priority ?? null,
        channel: body.channel ?? "in_app",
        isVisible: body.isVisible ?? true,
    });

    return buildReminderResponse({
        _id: reminder._id,
        workspaceId: reminder.workspaceId,
        createdByMemberId: reminder.createdByMemberId,
        recipientMemberIds: reminder.recipientMemberIds,
        title: reminder.title,
        description: reminder.description ?? null,
        type: reminder.type,
        relatedEntityType: reminder.relatedEntityType ?? null,
        relatedEntityId: reminder.relatedEntityId ?? null,
        dueDate: reminder.dueDate,
        isRecurring: reminder.isRecurring,
        recurrenceRule: reminder.recurrenceRule ?? null,
        status: reminder.status,
        responses: reminder.responses,
        priority: reminder.priority ?? null,
        channel: reminder.channel,
        isVisible: reminder.isVisible ?? true,
        createdAt: reminder.createdAt,
        updatedAt: reminder.updatedAt,
    });
}

export async function updateReminderService(
    input: UpdateReminderServiceInput
): Promise<ReminderResponseDto | null> {
    const { workspaceId, reminderId, body, actor } = input;

    const existingReminder = await findReminderById(
        workspaceId,
        reminderId,
        actor.workspaceMemberId,
        actor.workspaceMemberRole
    );

    if (!existingReminder) {
        return null;
    }

    ensureReminderCanBeManagedByActor(
        existingReminder,
        actor.workspaceMemberId,
        actor.workspaceMemberRole
    );

    const nextRelatedEntityType =
        body.relatedEntityType !== undefined
            ? body.relatedEntityType
            : existingReminder.relatedEntityType ?? null;

    const nextRelatedEntityId =
        body.relatedEntityId !== undefined
            ? parseRelatedEntityId(nextRelatedEntityType, body.relatedEntityId)
            : existingReminder.relatedEntityId ?? null;

    const nextDueDate =
        body.dueDate !== undefined
            ? parseRequiredDate(body.dueDate)
            : existingReminder.dueDate;

    const nextIsRecurring =
        body.isRecurring !== undefined
            ? body.isRecurring
            : existingReminder.isRecurring;

    const nextRecurrenceRule = normalizeRecurrenceRule(
        nextIsRecurring,
        body.recurrenceRule !== undefined
            ? body.recurrenceRule
            : existingReminder.recurrenceRule ?? null
    );

    validateRelatedEntityFields(nextRelatedEntityType, nextRelatedEntityId);

    let nextRecipientMemberIds = existingReminder.recipientMemberIds;
    let nextResponses = existingReminder.responses;

    if (body.targetMemberId !== undefined) {
        const nextTargetMemberId = parseOptionalObjectId(body.targetMemberId);
        nextRecipientMemberIds = await resolveRecipientMemberIds(
            workspaceId,
            nextTargetMemberId
        );
        nextResponses = mergeResponsesForRecipients(
            nextRecipientMemberIds,
            existingReminder.responses
        );
    }

    const nextStatus = computeReminderStatusFromResponses(nextResponses);

    const updatedReminder = await ReminderModel.findOneAndUpdate(
        {
            _id: reminderId,
            workspaceId,
        },
        {
            $set: {
                recipientMemberIds: nextRecipientMemberIds,
                title:
                    body.title !== undefined
                        ? body.title.trim()
                        : existingReminder.title,
                description:
                    body.description !== undefined
                        ? normalizeNullableString(body.description)
                        : existingReminder.description ?? null,
                type:
                    body.type !== undefined
                        ? body.type
                        : existingReminder.type,
                relatedEntityType: nextRelatedEntityType,
                relatedEntityId: nextRelatedEntityId,
                dueDate: nextDueDate,
                isRecurring: nextIsRecurring,
                recurrenceRule: nextRecurrenceRule,
                status: nextStatus,
                responses: nextResponses,
                priority:
                    body.priority !== undefined
                        ? body.priority
                        : existingReminder.priority ?? null,
                channel:
                    body.channel !== undefined
                        ? body.channel
                        : existingReminder.channel,
                isVisible:
                    body.isVisible !== undefined
                        ? body.isVisible
                        : existingReminder.isVisible ?? true,
            },
        },
        {
            new: true,
        }
    ).lean<ReminderDocument | null>();

    if (!updatedReminder) {
        return null;
    }

    return buildReminderResponse(updatedReminder);
}

export async function markReminderAsViewedService(
    workspaceId: Types.ObjectId,
    reminderId: Types.ObjectId,
    workspaceMemberId: Types.ObjectId,
    workspaceMemberRole: MemberRole
): Promise<ReminderResponseDto | null> {
    const reminder = await findReminderById(
        workspaceId,
        reminderId,
        workspaceMemberId,
        workspaceMemberRole
    );

    if (!reminder) {
        return null;
    }

    ensureMemberCanInteractWithReminder(reminder, workspaceMemberId);

    const now = new Date();

    const nextResponses = reminder.responses.map((response) => {
        if (response.memberId.toString() !== workspaceMemberId.toString()) {
            return response;
        }

        return {
            memberId: response.memberId,
            status: response.status,
            viewedAt: response.viewedAt ?? now,
            respondedAt: response.respondedAt ?? null,
        };
    });

    const updatedReminder = await ReminderModel.findOneAndUpdate(
        {
            _id: reminderId,
            workspaceId,
        },
        {
            $set: {
                responses: nextResponses,
            },
        },
        {
            new: true,
        }
    ).lean<ReminderDocument | null>();

    if (!updatedReminder) {
        return null;
    }

    return buildReminderResponse(updatedReminder);
}

export async function respondToReminderService(
    workspaceId: Types.ObjectId,
    reminderId: Types.ObjectId,
    workspaceMemberId: Types.ObjectId,
    workspaceMemberRole: MemberRole,
    body: RespondToReminderBody
): Promise<ReminderResponseDto | null> {
    const reminder = await findReminderById(
        workspaceId,
        reminderId,
        workspaceMemberId,
        workspaceMemberRole
    );

    if (!reminder) {
        return null;
    }

    ensureMemberCanInteractWithReminder(reminder, workspaceMemberId);

    const now = new Date();

    const nextResponses = reminder.responses.map((response) => {
        if (response.memberId.toString() !== workspaceMemberId.toString()) {
            return response;
        }

        return {
            memberId: response.memberId,
            status: body.status as ReminderMemberResponseStatus,
            viewedAt: response.viewedAt ?? now,
            respondedAt: now,
        };
    });

    const nextStatus = computeReminderStatusFromResponses(nextResponses);

    const updatedReminder = await ReminderModel.findOneAndUpdate(
        {
            _id: reminderId,
            workspaceId,
        },
        {
            $set: {
                responses: nextResponses,
                status: nextStatus,
            },
        },
        {
            new: true,
        }
    ).lean<ReminderDocument | null>();

    if (!updatedReminder) {
        return null;
    }

    return buildReminderResponse(updatedReminder);
}

export async function deleteReminderService(
    input: DeleteReminderServiceInput
): Promise<ReminderDocument | null> {
    const { workspaceId, reminderId, actor } = input;

    const existingReminder = await findReminderById(
        workspaceId,
        reminderId,
        actor.workspaceMemberId,
        actor.workspaceMemberRole
    );

    if (!existingReminder) {
        return null;
    }

    ensureReminderCanBeManagedByActor(
        existingReminder,
        actor.workspaceMemberId,
        actor.workspaceMemberRole
    );

    return ReminderModel.findOneAndDelete({
        _id: reminderId,
        workspaceId,
    }).lean<ReminderDocument | null>();
}