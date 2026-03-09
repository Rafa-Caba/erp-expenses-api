import { Types } from "mongoose";

import { WorkspaceMemberModel } from "@/src/workspaces/models/WorkspaceMember.model";
import { ReminderModel } from "../models/Reminder.model";
import type {
    CreateReminderServiceInput,
    DeleteReminderServiceInput,
    ReminderDocument,
    ReminderStatus,
    UpdateReminderServiceInput,
} from "../types/reminders.types";

type OptionalObjectId = Types.ObjectId | null;

export interface ReminderResponseDto extends ReminderDocument {
    isOverdue: boolean;
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

function resolveReminderStatus(status: ReminderStatus | undefined): ReminderStatus {
    return status ?? "pending";
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
    relatedEntityType: string | null | undefined,
    relatedEntityId: OptionalObjectId
): void {
    const hasRelatedEntityType =
        relatedEntityType !== undefined && relatedEntityType !== null;
    const hasRelatedEntityId = relatedEntityId !== null;

    if (hasRelatedEntityType !== hasRelatedEntityId) {
        throw new ReminderServiceError(
            "relatedEntityType y relatedEntityId deben enviarse juntos.",
            400,
            "INVALID_RELATED_ENTITY_PAIR"
        );
    }
}

async function validateMemberIfProvided(
    workspaceId: Types.ObjectId,
    memberId: OptionalObjectId
): Promise<void> {
    if (!memberId) {
        return;
    }

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

function buildReminderResponse(reminder: ReminderDocument): ReminderResponseDto {
    const isOverdue =
        reminder.status === "pending" && reminder.dueDate.getTime() < Date.now();

    return {
        ...reminder,
        memberId: reminder.memberId ?? null,
        description: reminder.description ?? null,
        relatedEntityType: reminder.relatedEntityType ?? null,
        relatedEntityId: reminder.relatedEntityId ?? null,
        recurrenceRule: reminder.recurrenceRule ?? null,
        priority: reminder.priority ?? null,
        isVisible: reminder.isVisible ?? true,
        isOverdue,
    };
}

async function findReminderById(
    workspaceId: Types.ObjectId,
    reminderId: Types.ObjectId
): Promise<ReminderDocument | null> {
    return ReminderModel.findOne({
        _id: reminderId,
        workspaceId,
    }).lean<ReminderDocument | null>();
}

export async function getRemindersService(
    workspaceId: Types.ObjectId
): Promise<ReminderResponseDto[]> {
    const reminders = await ReminderModel.find({
        workspaceId,
    })
        .sort({
            dueDate: 1,
            createdAt: -1,
        })
        .lean<ReminderDocument[]>();

    return reminders.map((reminder) => buildReminderResponse(reminder));
}

export async function getReminderByIdService(
    workspaceId: Types.ObjectId,
    reminderId: Types.ObjectId
): Promise<ReminderResponseDto | null> {
    const reminder = await findReminderById(workspaceId, reminderId);

    if (!reminder) {
        return null;
    }

    return buildReminderResponse(reminder);
}

export async function createReminderService(
    input: CreateReminderServiceInput
): Promise<ReminderResponseDto> {
    const { workspaceId, body } = input;

    const memberId = parseOptionalObjectId(body.memberId);
    const relatedEntityId = parseOptionalObjectId(body.relatedEntityId);
    const dueDate = parseRequiredDate(body.dueDate);
    const isRecurring = body.isRecurring;
    const recurrenceRule = normalizeRecurrenceRule(isRecurring, body.recurrenceRule);

    validateRelatedEntityFields(body.relatedEntityType, relatedEntityId);
    await validateMemberIfProvided(workspaceId, memberId);

    const reminder = await ReminderModel.create({
        workspaceId,
        memberId,
        title: body.title.trim(),
        description: normalizeNullableString(body.description),
        type: body.type,
        relatedEntityType: body.relatedEntityType ?? null,
        relatedEntityId,
        dueDate,
        isRecurring,
        recurrenceRule,
        status: resolveReminderStatus(body.status),
        priority: body.priority ?? null,
        channel: body.channel ?? "in_app",
        isVisible: body.isVisible ?? true,
    });

    return buildReminderResponse({
        _id: reminder._id,
        workspaceId: reminder.workspaceId,
        memberId: reminder.memberId ?? null,
        title: reminder.title,
        description: reminder.description ?? null,
        type: reminder.type,
        relatedEntityType: reminder.relatedEntityType ?? null,
        relatedEntityId: reminder.relatedEntityId ?? null,
        dueDate: reminder.dueDate,
        isRecurring: reminder.isRecurring,
        recurrenceRule: reminder.recurrenceRule ?? null,
        status: reminder.status,
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
    const { workspaceId, reminderId, body } = input;

    const existingReminder = await findReminderById(workspaceId, reminderId);

    if (!existingReminder) {
        return null;
    }

    const nextMemberId =
        body.memberId !== undefined
            ? parseOptionalObjectId(body.memberId)
            : existingReminder.memberId ?? null;

    const nextRelatedEntityId =
        body.relatedEntityId !== undefined
            ? parseOptionalObjectId(body.relatedEntityId)
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

    const nextRelatedEntityType =
        body.relatedEntityType !== undefined
            ? body.relatedEntityType
            : existingReminder.relatedEntityType ?? null;

    validateRelatedEntityFields(nextRelatedEntityType, nextRelatedEntityId);
    await validateMemberIfProvided(workspaceId, nextMemberId);

    const updatedReminder = await ReminderModel.findOneAndUpdate(
        {
            _id: reminderId,
            workspaceId,
        },
        {
            $set: {
                memberId: nextMemberId,
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
                status:
                    body.status !== undefined
                        ? body.status
                        : existingReminder.status,
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

export async function deleteReminderService(
    input: DeleteReminderServiceInput
): Promise<ReminderDocument | null> {
    const { workspaceId, reminderId } = input;

    return ReminderModel.findOneAndDelete({
        _id: reminderId,
        workspaceId,
    }).lean<ReminderDocument | null>();
}