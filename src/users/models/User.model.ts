// src/users/models/User.model.ts

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";
import type { CurrencyCode } from "@/src/shared/types/common";

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      // NOTE: do NOT add index: true here because we create a unique index below
    },
    passwordHash: { type: String, required: true },

    defaultCurrency: {
      type: String,
      required: true,
      enum: ["MXN", "USD"],
      default: "MXN" satisfies CurrencyCode,
    },
    timezone: { type: String, required: true, default: "America/Mexico_City" },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Unique email index (single source of truth)
UserSchema.index({ email: 1 }, { unique: true });

applyToJsonTransform(UserSchema);

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const UserModel: Model<UserDoc> =
  mongoose.models.User || mongoose.model<UserDoc>("User", UserSchema);
