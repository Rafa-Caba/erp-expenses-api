// src/transactions/models/Transaction.model.ts

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";
import type { CurrencyCode } from "@/src/shared/types/common";
import type { TransactionType, Visibility } from "@/src/shared/types/finance";

const AttachmentSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const TransactionSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

    /**
     * Ledger-based transaction "type"
     * Keep this aligned with shared/types/finance.
     * NOTE: includes DEBT_PAYMENT for future debt module integration.
     */
    type: {
      type: String,
      required: true,
      enum: ["INCOME", "EXPENSE", "TRANSFER", "ADJUSTMENT", "DEBT_PAYMENT"] satisfies TransactionType[],
      index: true,
    },

    date: { type: Date, required: true, index: true },

    currency: {
      type: String,
      required: true,
      enum: ["MXN", "USD"] satisfies CurrencyCode[],
      default: "MXN" satisfies CurrencyCode,
      index: true,
    },

    /**
     * Visibility enforcement happens in service layer:
     * - SHARED: visible to all members
     * - PRIVATE: visible only to privileged (OWNER/ADMIN) OR creator (createdByUserId)
     */
    visibility: {
      type: String,
      required: true,
      enum: ["SHARED", "PRIVATE"] satisfies Visibility[],
      default: "SHARED" satisfies Visibility,
      index: true,
    },

    /**
     * Optional "owner" concept (legacy-friendly).
     * In most cases createdByUserId is enough, but we keep this for future UX:
     * e.g. "this expense belongs to Caro even if admin created it".
     */
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

    /**
     * Optional link to a Debt doc (future module)
     * DEBT_PAYMENT transactions can point here.
     */
    debtId: { type: Schema.Types.ObjectId, ref: "Debt", default: null, index: true },

    tags: { type: [String], default: [], index: true },

    note: { type: String, default: null, maxlength: 2000 },

    attachments: { type: [AttachmentSchema], default: [] },

    /**
     * Totals are stored for fast list/summary queries.
     * These must be consistent with TransactionLines.
     * - totalAmount: absolute total for display (e.g. expense 1200)
     * - transferAmount: optional, for TRANSFER
     * - feeAmount: optional, for fees
     */
    totalAmount: { type: Number, required: true },
    transferAmount: { type: Number, default: null },
    feeAmount: { type: Number, default: null },

    /**
     * Soft delete (keep history)
     */
    isDeleted: { type: Boolean, required: true, default: false, index: true },
    deletedAt: { type: Date, default: null },

    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

/**
 * Stable list sorting: date desc, createdAt desc, _id desc
 * Primary index for list queries.
 */
TransactionSchema.index({ workspaceId: 1, isDeleted: 1, date: -1, createdAt: -1, _id: -1 });

/**
 * Visibility filtering:
 * - SHARED: workspaceId + visibility + isDeleted + date
 */
TransactionSchema.index({ workspaceId: 1, visibility: 1, isDeleted: 1, date: -1, createdAt: -1 });

/**
 * Own PRIVATE (non-privileged enforcement):
 * - workspaceId + visibility + createdByUserId + isDeleted + date
 */
TransactionSchema.index({
  workspaceId: 1,
  visibility: 1,
  createdByUserId: 1,
  isDeleted: 1,
  date: -1,
  createdAt: -1,
});

/**
 * Optional: quick counts/summaries by type
 */
TransactionSchema.index({ workspaceId: 1, type: 1, isDeleted: 1, date: -1 });

/**
 * Optional: owner-centric queries (e.g. filter by "belongs to Caro")
 */
TransactionSchema.index({ workspaceId: 1, ownerUserId: 1, isDeleted: 1, date: -1 });

/**
 * Optional: debt-centric queries (future debt module)
 */
TransactionSchema.index({ workspaceId: 1, debtId: 1, isDeleted: 1, date: -1 });

applyToJsonTransform(TransactionSchema);

export type TransactionDoc = InferSchemaType<typeof TransactionSchema>;

export const TransactionModel: Model<TransactionDoc> =
  mongoose.models.Transaction || mongoose.model<TransactionDoc>("Transaction", TransactionSchema);