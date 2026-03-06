// src/scheduled/models/ScheduledOccurrence.model.ts

import mongoose, { Schema, type InferSchemaType, type Model, Types } from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";

const ScheduledOccurrenceSchema = new Schema(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        scheduledItemId: { type: Schema.Types.ObjectId, ref: "ScheduledItem", required: true, index: true },

        runAt: { type: Date, required: true, index: true },

        // YYYY-MM-DD in workspace tz (see utils/dateKey)
        dateKey: { type: String, required: true, index: true },

        status: {
            type: String,
            required: true,
            enum: ["PENDING", "PAID", "SKIPPED", "CANCELED"],
            default: "PENDING",
            index: true,
        },

        paidAt: { type: Date, default: null },
        paidByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

        transactionId: { type: Schema.Types.ObjectId, ref: "Transaction", default: null, index: true },

        // pay-time details
        accountId: { type: Schema.Types.ObjectId, ref: "Account", default: null, index: true },
        categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
        note: { type: String, default: null, maxlength: 4000 },

        createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

// ✅ Idempotency
ScheduledOccurrenceSchema.index({ scheduledItemId: 1, dateKey: 1 }, { unique: true });
ScheduledOccurrenceSchema.index({ workspaceId: 1, status: 1, runAt: 1 });

applyToJsonTransform(ScheduledOccurrenceSchema);

export type ScheduledOccurrenceDoc = InferSchemaType<typeof ScheduledOccurrenceSchema>;

export const ScheduledOccurrenceModel: Model<ScheduledOccurrenceDoc> =
    mongoose.models.ScheduledOccurrence ||
    mongoose.model<ScheduledOccurrenceDoc>("ScheduledOccurrence", ScheduledOccurrenceSchema);