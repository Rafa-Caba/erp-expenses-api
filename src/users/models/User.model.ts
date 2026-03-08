// src/users/models/User.model.ts

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";

const UserSchema = new Schema(
    {
        fullName: {
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
        },
        passwordHash: {
            type: String,
            required: true,
        },

        phone: {
            type: String,
            trim: true,
            maxlength: 30,
            default: null,
        },
        avatarUrl: {
            type: String,
            trim: true,
            default: null,
        },
        avatarPublicId: {
            type: String,
            trim: true,
            default: null,
        },

        role: {
            type: String,
            required: true,
            enum: ["USER", "ADMIN"],
            default: "USER",
        },

        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },

        emailVerificationTokenHash: {
            type: String,
            default: null,
        },
        emailVerificationExpiresAt: {
            type: Date,
            default: null,
        },

        passwordResetTokenHash: {
            type: String,
            default: null,
        },
        passwordResetExpiresAt: {
            type: Date,
            default: null,
        },

        lastLoginAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });

applyToJsonTransform(UserSchema);

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const UserModel: Model<UserDoc> =
    mongoose.models.User || mongoose.model<UserDoc>("User", UserSchema);