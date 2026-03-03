// src/accounts/models/Account.model.ts

import mongoose, {
  Schema,
  type InferSchemaType,
  type Model,
  Types,
} from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";
import type {
  AccountType,
  CurrencyCode,
  Visibility,
} from "@/src/shared/types/common";

const AccountSchema = new Schema(
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
      enum: ["cash", "debit", "credit", "wallet"] satisfies AccountType[],
    },

    currency: {
      type: String,
      required: true,
      enum: ["MXN", "USD"],
      default: "MXN" satisfies CurrencyCode,
    },

    startingBalance: { type: Number, required: true, default: 0 },

    isActive: { type: Boolean, required: true, default: true },

    visibility: {
      type: String,
      required: true,
      enum: ["shared", "private"] satisfies Visibility[],
      default: "shared",
      index: true,
    },

    ownerUserId: { type: Types.ObjectId, ref: "User", default: null },

    // Credit meta (only meaningful if type === "credit")
    creditLimit: { type: Number, default: null },
    statementDay: { type: Number, default: null, min: 1, max: 31 },
    dueDay: { type: Number, default: null, min: 1, max: 31 },

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

AccountSchema.index({ workspaceId: 1, isActive: 1, type: 1 });
AccountSchema.index({ workspaceId: 1, name: 1 }, { unique: false });

applyToJsonTransform(AccountSchema);

export type AccountDoc = InferSchemaType<typeof AccountSchema>;

export const AccountModel: Model<AccountDoc> =
  mongoose.models.Account ||
  mongoose.model<AccountDoc>("Account", AccountSchema);
