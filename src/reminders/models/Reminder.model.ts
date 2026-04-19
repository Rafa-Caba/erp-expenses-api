import { Schema, model, type Model } from "mongoose";

import type {
    ReminderDocument,
    ReminderMemberResponse,
} from "../types/reminders.types";
import {
    REMINDER_CHANNEL_VALUES,
    REMINDER_MEMBER_RESPONSE_STATUS_VALUES,
    REMINDER_PRIORITY_VALUES,
    REMINDER_RELATED_ENTITY_TYPE_VALUES,
    REMINDER_STATUS_VALUES,
    REMINDER_TYPE_VALUES,
} from "../types/reminders.types";

const reminderMemberResponseSchema = new Schema<ReminderMemberResponse>(
    {
        memberId: {
            type: Schema.Types.ObjectId,
            ref: "WorkspaceMember",
            required: true,
        },
        status: {
            type: String,
            enum: REMINDER_MEMBER_RESPONSE_STATUS_VALUES,
            required: true,
            default: "pending",
            trim: true,
        },
        viewedAt: {
            type: Date,
            default: null,
        },
        respondedAt: {
            type: Date,
            default: null,
        },
    },
    {
        _id: false,
        versionKey: false,
    }
);

const reminderSchema = new Schema<ReminderDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
        },
        createdByMemberId: {
            type: Schema.Types.ObjectId,
            ref: "WorkspaceMember",
            required: true,
            index: true,
        },
        recipientMemberIds: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "WorkspaceMember",
                    required: true,
                },
            ],
            required: true,
            default: [],
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },
        type: {
            type: String,
            enum: REMINDER_TYPE_VALUES,
            required: true,
            trim: true,
        },
        relatedEntityType: {
            type: String,
            enum: REMINDER_RELATED_ENTITY_TYPE_VALUES,
            default: null,
            trim: true,
        },
        relatedEntityId: {
            type: String,
            trim: true,
            default: null,
        },
        dueDate: {
            type: Date,
            required: true,
        },
        isRecurring: {
            type: Boolean,
            required: true,
            default: false,
        },
        recurrenceRule: {
            type: String,
            trim: true,
            maxlength: 255,
            default: null,
        },
        status: {
            type: String,
            enum: REMINDER_STATUS_VALUES,
            required: true,
            default: "pending",
            trim: true,
        },
        responses: {
            type: [reminderMemberResponseSchema],
            required: true,
            default: [],
        },
        priority: {
            type: String,
            enum: REMINDER_PRIORITY_VALUES,
            default: null,
            trim: true,
        },
        channel: {
            type: String,
            enum: REMINDER_CHANNEL_VALUES,
            required: true,
            default: "in_app",
            trim: true,
        },
        isVisible: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

reminderSchema.index({ workspaceId: 1, dueDate: 1, status: 1 });
reminderSchema.index({ workspaceId: 1, createdByMemberId: 1, dueDate: 1 });
reminderSchema.index({ workspaceId: 1, recipientMemberIds: 1, dueDate: 1 });
reminderSchema.index({ workspaceId: 1, "responses.memberId": 1, dueDate: 1 });
reminderSchema.index({
    workspaceId: 1,
    "responses.memberId": 1,
    "responses.status": 1,
});
reminderSchema.index({ workspaceId: 1, type: 1, status: 1, dueDate: 1 });
reminderSchema.index({ workspaceId: 1, relatedEntityType: 1, relatedEntityId: 1 });
reminderSchema.index({ workspaceId: 1, isRecurring: 1, status: 1 });
reminderSchema.index({ workspaceId: 1, priority: 1, dueDate: 1 });
reminderSchema.index({ workspaceId: 1, channel: 1, status: 1 });
reminderSchema.index({ workspaceId: 1, isVisible: 1, createdAt: -1 });
reminderSchema.index({ workspaceId: 1, title: 1 });

export type ReminderModelType = Model<ReminderDocument>;

export const ReminderModel = model<ReminderDocument, ReminderModelType>(
    "Reminder",
    reminderSchema
);