// src/reminders/types/reminders.types.ts

import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";
import { MemberRole } from "@/src/shared/types/common";

export const REMINDER_TYPE_VALUES = [
    "bill",
    "debt",
    "subscription",
    "custom",
] as const;

export type ReminderType = (typeof REMINDER_TYPE_VALUES)[number];

export const REMINDER_STATUS_VALUES = [
    "pending",
    "in_progress",
    "resolved",
] as const;

export type ReminderStatus = (typeof REMINDER_STATUS_VALUES)[number];

export const REMINDER_MEMBER_RESPONSE_STATUS_VALUES = [
    "pending",
    "done",
    "dismissed",
] as const;

export type ReminderMemberResponseStatus =
    (typeof REMINDER_MEMBER_RESPONSE_STATUS_VALUES)[number];

export const REMINDER_PRIORITY_VALUES = [
    "low",
    "medium",
    "high",
] as const;

export type ReminderPriority = (typeof REMINDER_PRIORITY_VALUES)[number];

export const REMINDER_CHANNEL_VALUES = [
    "in_app",
    "email",
    "both",
] as const;

export type ReminderChannel = (typeof REMINDER_CHANNEL_VALUES)[number];

export const REMINDER_RELATED_ENTITY_TYPE_VALUES = [
    "transaction",
    "receipt",
    "debt",
    "payment",
    "budget",
    "saving_goal",
    "account",
    "card",
    "custom",
] as const;

export type ReminderRelatedEntityType =
    (typeof REMINDER_RELATED_ENTITY_TYPE_VALUES)[number];

export interface ReminderMemberResponse {
    memberId: Types.ObjectId;
    status: ReminderMemberResponseStatus;
    viewedAt: Date | null;
    respondedAt: Date | null;
}

export interface ReminderDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    createdByMemberId: Types.ObjectId;
    recipientMemberIds: Types.ObjectId[];
    title: string;
    description?: string | null;
    type: ReminderType;
    relatedEntityType?: ReminderRelatedEntityType | null;
    relatedEntityId?: string | null;
    dueDate: Date;
    isRecurring: boolean;
    recurrenceRule?: string | null;
    status: ReminderStatus;
    responses: ReminderMemberResponse[];
    priority?: ReminderPriority | null;
    channel: ReminderChannel;
    isVisible?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkspaceReminderParams extends ParamsDictionary {
    workspaceId: string;
}

export interface ReminderParams extends ParamsDictionary {
    workspaceId: string;
    reminderId: string;
}

export interface CreateReminderBody {
    targetMemberId?: string | null;
    title: string;
    description?: string | null;
    type: ReminderType;
    relatedEntityType?: ReminderRelatedEntityType | null;
    relatedEntityId?: string | null;
    dueDate: string;
    isRecurring: boolean;
    recurrenceRule?: string | null;
    priority?: ReminderPriority | null;
    channel?: ReminderChannel;
    isVisible?: boolean;
}

export interface UpdateReminderBody {
    targetMemberId?: string | null;
    title?: string;
    description?: string | null;
    type?: ReminderType;
    relatedEntityType?: ReminderRelatedEntityType | null;
    relatedEntityId?: string | null;
    dueDate?: string;
    isRecurring?: boolean;
    recurrenceRule?: string | null;
    priority?: ReminderPriority | null;
    channel?: ReminderChannel;
    isVisible?: boolean;
}

export interface RespondToReminderBody {
    status: Exclude<ReminderMemberResponseStatus, "pending">;
}

export interface ReminderActorContext {
    workspaceMemberId: Types.ObjectId;
    workspaceMemberRole: MemberRole;
}

export interface CreateReminderServiceInput {
    workspaceId: Types.ObjectId;
    body: CreateReminderBody;
    workspace: WorkspaceDocument;
    actor: ReminderActorContext;
}

export interface UpdateReminderServiceInput {
    workspaceId: Types.ObjectId;
    reminderId: Types.ObjectId;
    body: UpdateReminderBody;
    workspace: WorkspaceDocument;
    actor: ReminderActorContext;
}

export interface DeleteReminderServiceInput {
    workspaceId: Types.ObjectId;
    reminderId: Types.ObjectId;
    workspace: WorkspaceDocument;
    actor: ReminderActorContext;
}