import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";

export const REMINDER_TYPE_VALUES = [
    "bill",
    "debt",
    "subscription",
    "custom",
] as const;

export type ReminderType = (typeof REMINDER_TYPE_VALUES)[number];

export const REMINDER_STATUS_VALUES = [
    "pending",
    "done",
    "dismissed",
] as const;

export type ReminderStatus = (typeof REMINDER_STATUS_VALUES)[number];

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

export interface ReminderDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    memberId?: Types.ObjectId | null;
    title: string;
    description?: string | null;
    type: ReminderType;
    relatedEntityType?: ReminderRelatedEntityType | null;
    relatedEntityId?: Types.ObjectId | null;
    dueDate: Date;
    isRecurring: boolean;
    recurrenceRule?: string | null;
    status: ReminderStatus;
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
    memberId?: string | null;
    title: string;
    description?: string | null;
    type: ReminderType;
    relatedEntityType?: ReminderRelatedEntityType | null;
    relatedEntityId?: string | null;
    dueDate: string;
    isRecurring: boolean;
    recurrenceRule?: string | null;
    status?: ReminderStatus;
    priority?: ReminderPriority | null;
    channel?: ReminderChannel;
    isVisible?: boolean;
}

export interface UpdateReminderBody {
    memberId?: string | null;
    title?: string;
    description?: string | null;
    type?: ReminderType;
    relatedEntityType?: ReminderRelatedEntityType | null;
    relatedEntityId?: string | null;
    dueDate?: string;
    isRecurring?: boolean;
    recurrenceRule?: string | null;
    status?: ReminderStatus;
    priority?: ReminderPriority | null;
    channel?: ReminderChannel;
    isVisible?: boolean;
}

export interface CreateReminderServiceInput {
    workspaceId: Types.ObjectId;
    body: CreateReminderBody;
    workspace: WorkspaceDocument;
}

export interface UpdateReminderServiceInput {
    workspaceId: Types.ObjectId;
    reminderId: Types.ObjectId;
    body: UpdateReminderBody;
    workspace: WorkspaceDocument;
}

export interface DeleteReminderServiceInput {
    workspaceId: Types.ObjectId;
    reminderId: Types.ObjectId;
    workspace: WorkspaceDocument;
}