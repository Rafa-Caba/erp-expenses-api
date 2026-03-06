import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";

const RefreshTokenSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
        revokedAt: {
            type: Date,
            default: null,
            index: true,
        },
        replacedByTokenHash: {
            type: String,
            default: null,
        },
        lastUsedAt: {
            type: Date,
            default: null,
        },
        ipAddress: {
            type: String,
            default: null,
        },
        userAgent: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

RefreshTokenSchema.index({ userId: 1, revokedAt: 1 });
RefreshTokenSchema.index({ userId: 1, expiresAt: 1 });

applyToJsonTransform(RefreshTokenSchema);

export type RefreshTokenDoc = InferSchemaType<typeof RefreshTokenSchema>;

export const RefreshTokenModel: Model<RefreshTokenDoc> =
    mongoose.models.RefreshToken ||
    mongoose.model<RefreshTokenDoc>("RefreshToken", RefreshTokenSchema);