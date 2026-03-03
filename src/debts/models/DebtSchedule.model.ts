// src/debts/models/DebtSchedule.model.ts

import mongoose, {
  Schema,
  type InferSchemaType,
  type Model,
  Types,
} from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";
import type { DebtScheduleStatus } from "@/src/shared/types/common";

const DebtScheduleSchema = new Schema(
  {
    workspaceId: {
      type: Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    debtId: { type: Types.ObjectId, ref: "Debt", required: true, index: true },

    dueDate: { type: Date, required: true, index: true },
    amountExpected: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "paid",
        "overdue",
        "skipped",
      ] satisfies DebtScheduleStatus[],
      default: "pending",
      index: true,
    },

    paidAt: { type: Date, default: null },
    paidTransactionId: {
      type: Types.ObjectId,
      ref: "Transaction",
      default: null,
    },

    createdByUserId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    updatedByUserId: { type: Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

DebtScheduleSchema.index(
  { workspaceId: 1, debtId: 1, dueDate: 1 },
  { unique: false }
);
DebtScheduleSchema.index({ workspaceId: 1, status: 1, dueDate: 1 });

applyToJsonTransform(DebtScheduleSchema);

export type DebtScheduleDoc = InferSchemaType<typeof DebtScheduleSchema>;

export const DebtScheduleModel: Model<DebtScheduleDoc> =
  mongoose.models.DebtSchedule ||
  mongoose.model<DebtScheduleDoc>("DebtSchedule", DebtScheduleSchema);
