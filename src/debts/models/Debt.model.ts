// src/debts/models/Debt.model.ts

import mongoose, {
  Schema,
  type InferSchemaType,
  type Model,
  Types,
} from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";
import type {
  CurrencyCode,
  DebtType,
  Visibility,
} from "@/src/shared/types/common";

const DebtDueRuleSchema = new Schema(
  {
    kind: {
      type: String,
      required: true,
      enum: ["credit_card", "loan", "custom"],
    },

    // credit_card
    statementDay: { type: Number, default: null, min: 1, max: 31 },
    dueDay: { type: Number, default: null, min: 1, max: 31 },

    // loan
    frequency: { type: String, default: null, enum: ["monthly", "biweekly"] },
    dayOfMonth: { type: Number, default: null, min: 1, max: 31 },

    // custom
    note: { type: String, default: null, maxlength: 500 },
  },
  { _id: false }
);

const DebtSchema = new Schema(
  {
    workspaceId: {
      type: Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    type: {
      type: String,
      required: true,
      enum: ["credit_card", "loan", "personal", "service"] satisfies DebtType[],
    },

    principal: { type: Number, required: true, min: 0 },
    balance: { type: Number, required: true, min: 0 },

    currency: {
      type: String,
      required: true,
      enum: ["MXN", "USD"],
      default: "MXN" satisfies CurrencyCode,
    },

    apr: { type: Number, default: null, min: 0 },
    minPayment: { type: Number, default: null, min: 0 },

    startDate: { type: Date, required: true },

    dueRule: { type: DebtDueRuleSchema, required: true },

    visibility: {
      type: String,
      required: true,
      enum: ["shared", "private"] satisfies Visibility[],
      default: "shared",
      index: true,
    },

    ownerUserId: { type: Types.ObjectId, ref: "User", default: null },

    isActive: { type: Boolean, required: true, default: true },

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

DebtSchema.index({ workspaceId: 1, isActive: 1, type: 1 });

applyToJsonTransform(DebtSchema);

export type DebtDoc = InferSchemaType<typeof DebtSchema>;

export const DebtModel: Model<DebtDoc> =
  mongoose.models.Debt || mongoose.model<DebtDoc>("Debt", DebtSchema);
