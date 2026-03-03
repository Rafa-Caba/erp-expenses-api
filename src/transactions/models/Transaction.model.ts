// src/transactions/models/Transaction.model.ts

import mongoose, {
  Schema,
  type InferSchemaType,
  type Model,
  Types,
} from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";
import type {
  CurrencyCode,
  TransactionDirection,
  TransactionType,
  Visibility,
} from "@/src/shared/types/common";

const AttachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const TransactionSchema = new Schema(
  {
    workspaceId: {
      type: Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "expense",
        "income",
        "debt_payment",
        "transfer",
        "adjustment",
      ] satisfies TransactionType[],
      index: true,
    },

    direction: {
      type: String,
      required: true,
      enum: ["in", "out"] satisfies TransactionDirection[],
      index: true,
    },

    amount: { type: Number, required: true, min: 0 },

    currency: {
      type: String,
      required: true,
      enum: ["MXN", "USD"],
      default: "MXN" satisfies CurrencyCode,
    },

    date: { type: Date, required: true, index: true },

    accountId: {
      type: Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    categoryId: {
      type: Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    tags: { type: [String], default: [] },
    note: { type: String, default: null, maxlength: 2000 },

    visibility: {
      type: String,
      required: true,
      enum: ["shared", "private"] satisfies Visibility[],
      default: "shared",
      index: true,
    },

    ownerUserId: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Links
    debtId: { type: Types.ObjectId, ref: "Debt", default: null, index: true },

    // Transfers: recommended approach = 2 docs linked by transferGroupId
    transferToAccountId: {
      type: Types.ObjectId,
      ref: "Account",
      default: null,
    },
    transferGroupId: { type: String, default: null, index: true },

    attachments: { type: [AttachmentSchema], default: [] },

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

TransactionSchema.index({ workspaceId: 1, date: -1 });
TransactionSchema.index({ workspaceId: 1, type: 1, date: -1 });
TransactionSchema.index({ workspaceId: 1, accountId: 1, date: -1 });

applyToJsonTransform(TransactionSchema);

export type TransactionDoc = InferSchemaType<typeof TransactionSchema>;

export const TransactionModel: Model<TransactionDoc> =
  mongoose.models.Transaction ||
  mongoose.model<TransactionDoc>("Transaction", TransactionSchema);
