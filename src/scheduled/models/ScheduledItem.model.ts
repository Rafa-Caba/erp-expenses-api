// src/scheduled/models/ScheduledItem.model.ts

import mongoose, { Schema, type InferSchemaType, type Model, Types } from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";
import type { Visibility } from "@/src/shared/types/finance";

const RecurrenceSchema = new Schema(
    {
        type: { type: String, required: true, enum: ["WEEKLY", "MONTHLY", "CUSTOM_INTERVAL"] },

        // WEEKLY
        intervalWeeks: { type: Number, default: null },
        byWeekday: { type: [Number], default: null },

        // MONTHLY
        mode: { type: String, default: null, enum: ["DAY_OF_MONTH", "NTH_WEEKDAY", null] },
        intervalMonths: { type: Number, default: null },
        day: { type: Number, default: null },
        clamp: { type: Boolean, default: null },
        nth: { type: Number, default: null },
        weekday: { type: Number, default: null },

        // CUSTOM_INTERVAL
        unit: { type: String, default: null, enum: ["day", "week", "month", null] },
        interval: { type: Number, default: null },
    },
    { _id: false }
);

const ScheduledItemSchema = new Schema(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

        title: { type: String, required: true, trim: true, maxlength: 200 },

        kind: { type: String, required: true, enum: ["BILL", "INCOME"], index: true },

        // Only EXPENSE / INCOME
        txTypeOnPay: { type: String, required: true, enum: ["EXPENSE", "INCOME"], index: true },

        amount: { type: Number, required: true },
        currency: { type: String, required: true, enum: ["MXN", "USD"], default: "MXN", index: true },

        defaultCategoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
        note: { type: String, default: null, maxlength: 4000 },

        startDate: { type: Date, required: true, index: true },
        recurrence: { type: RecurrenceSchema, required: true },

        nextRunAt: { type: Date, required: true, index: true },

        endDate: { type: Date, default: null },
        maxOccurrences: { type: Number, default: null },

        status: { type: String, required: true, enum: ["ACTIVE", "PAUSED", "CANCELED"], default: "ACTIVE", index: true },

        visibility: { type: String, required: true, enum: ["SHARED", "PRIVATE"], default: "SHARED", index: true },
        ownerUserId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

        isDeleted: { type: Boolean, required: true, default: false, index: true },
        deletedAt: { type: Date, default: null },

        createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

ScheduledItemSchema.index({ workspaceId: 1, isDeleted: 1, status: 1, nextRunAt: 1 });
ScheduledItemSchema.index({ workspaceId: 1, isDeleted: 1, visibility: 1, createdAt: -1 });

applyToJsonTransform(ScheduledItemSchema);

export type ScheduledItemDoc = InferSchemaType<typeof ScheduledItemSchema>;

export const ScheduledItemModel: Model<ScheduledItemDoc> =
    mongoose.models.ScheduledItem || mongoose.model<ScheduledItemDoc>("ScheduledItem", ScheduledItemSchema);