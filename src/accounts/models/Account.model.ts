// src/accounts/models/Account.model.ts

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";
import type { CurrencyCode } from "@/src/shared/types/common";

const AccountSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },

    type: { type: String, required: true, enum: ["CASH", "BANK", "CREDIT_CARD"] },

    currency: {
      type: String,
      required: true,
      enum: ["MXN", "USD"],
      default: "MXN" satisfies CurrencyCode,
      index: true,
    },

    note: { type: String, default: null },

    initialBalance: { type: Number, required: true, default: 0 },

    isActive: { type: Boolean, default: true, index: true },

    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Unique name per workspace (simple but practical)
AccountSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

// Helpful list indexes
AccountSchema.index({ workspaceId: 1, isActive: 1, name: 1 });

applyToJsonTransform(AccountSchema);

export type AccountDoc = InferSchemaType<typeof AccountSchema>;

export const AccountModel: Model<AccountDoc> =
  mongoose.models.Account || mongoose.model<AccountDoc>("Account", AccountSchema);