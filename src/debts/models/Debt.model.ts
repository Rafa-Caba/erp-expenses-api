// src/debts/models/Debt.model.ts

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";
import type { Visibility } from "@/src/shared/types/finance";
import type { CurrencyCode } from "@/src/shared/types/common";

export type DebtKind = "I_OWE" | "OWE_ME";
export type DebtStatus = "ACTIVE" | "PAID" | "CANCELED";

const DebtSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

    kind: {
      type: String,
      required: true,
      enum: ["I_OWE", "OWE_ME"] satisfies DebtKind[],
      index: true,
    },

    currency: {
      type: String,
      required: true,
      enum: ["MXN", "USD"] satisfies CurrencyCode[],
      default: "MXN" satisfies CurrencyCode,
      index: true,
    },

    visibility: {
      type: String,
      required: true,
      enum: ["SHARED", "PRIVATE"] satisfies Visibility[],
      default: "SHARED" satisfies Visibility,
      index: true,
    },

    /**
     * ownerUserId rules (your definition):
     * - If visibility === PRIVATE => ownerUserId is REQUIRED, and only owner can see/mutate.
     * - If visibility === SHARED  => ownerUserId can be null.
     */
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

    counterparty: { type: String, required: true, trim: true, maxlength: 200 },

    principal: { type: Number, required: true },
    remaining: { type: Number, required: true },

    dueDate: { type: Date, default: null, index: true },

    note: { type: String, default: null, maxlength: 2000 },

    status: {
      type: String,
      required: true,
      enum: ["ACTIVE", "PAID", "CANCELED"] satisfies DebtStatus[],
      default: "ACTIVE" satisfies DebtStatus,
      index: true,
    },

    // Soft delete for history consistency (same style as transactions)
    isDeleted: { type: Boolean, required: true, default: false, index: true },
    deletedAt: { type: Date, default: null },

    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

DebtSchema.index({ workspaceId: 1, isDeleted: 1, status: 1, dueDate: 1, createdAt: -1, _id: -1 });
DebtSchema.index({ workspaceId: 1, isDeleted: 1, kind: 1, createdAt: -1 });

applyToJsonTransform(DebtSchema);

export type DebtDoc = InferSchemaType<typeof DebtSchema>;

export const DebtModel: Model<DebtDoc> =
  mongoose.models.Debt || mongoose.model<DebtDoc>("Debt", DebtSchema);