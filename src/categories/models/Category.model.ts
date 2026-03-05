// src/categories/models/Category.model.ts

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";

const CategorySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },

    type: { type: String, required: true, enum: ["INCOME", "EXPENSE"], index: true },

    color: { type: String, default: null },
    iconKey: { type: String, default: null },

    isActive: { type: Boolean, default: true, index: true },

    note: { type: String, default: null },

    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

CategorySchema.index({ workspaceId: 1, type: 1, name: 1 }, { unique: true });
CategorySchema.index({ workspaceId: 1, isActive: 1, type: 1, name: 1 });

applyToJsonTransform(CategorySchema);

export type CategoryDoc = InferSchemaType<typeof CategorySchema>;

export const CategoryModel: Model<CategoryDoc> =
  mongoose.models.Category || mongoose.model<CategoryDoc>("Category", CategorySchema);