// src/auth/models/RefreshToken.model.ts

import mongoose, {
  Schema,
  type InferSchemaType,
  type Model,
  Types,
} from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";

const RefreshTokenSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },

    // hash of refresh token (never store raw token)
    tokenHash: { type: String, required: true },

    // unique token identifier included in JWT payload
    tokenId: { type: String, required: true, index: true },

    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: true },

    createdAtIp: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);

RefreshTokenSchema.index({ userId: 1, tokenId: 1 }, { unique: true });

applyToJsonTransform(RefreshTokenSchema);

export type RefreshTokenDoc = InferSchemaType<typeof RefreshTokenSchema>;

export const RefreshTokenModel: Model<RefreshTokenDoc> =
  mongoose.models.RefreshToken ||
  mongoose.model<RefreshTokenDoc>("RefreshToken", RefreshTokenSchema);
