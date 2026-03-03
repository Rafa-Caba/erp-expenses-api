// src/categories/models/Category.model.ts

import mongoose, {
  Schema,
  type InferSchemaType,
  type Model,
  Types,
} from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";
import type { CategoryType } from "@/src/categories/types/category.types";

const CategorySchema = new Schema(
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
      maxlength: 80,
    },

    type: {
      type: String,
      required: true,
      enum: ["expense", "income", "both"] satisfies CategoryType[],
      default: "expense",
    },

    isActive: { type: Boolean, required: true, default: true },

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

CategorySchema.index({ workspaceId: 1, isActive: 1, type: 1 });
CategorySchema.index({ workspaceId: 1, name: 1 }, { unique: false });

applyToJsonTransform(CategorySchema);

export type CategoryDoc = InferSchemaType<typeof CategorySchema>;

export const CategoryModel: Model<CategoryDoc> =
  mongoose.models.Category ||
  mongoose.model<CategoryDoc>("Category", CategorySchema);
