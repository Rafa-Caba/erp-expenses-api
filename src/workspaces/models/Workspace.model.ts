// src/workspaces/models/Workspace.model.ts

import mongoose, {
  Schema,
  type InferSchemaType,
  type Model,
  Types,
} from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";
import type { CurrencyCode, WorkspaceKind } from "@/src/shared/types/common";

const WorkspaceSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    kind: {
      type: String,
      required: true,
      enum: ["SHARED", "INDIVIDUAL"],
    },

    currencyDefault: {
      type: String,
      required: true,
      enum: ["MXN", "USD"],
      default: "MXN" satisfies CurrencyCode,
    },
    timezone: { type: String, required: true, default: "America/Mexico_City" },

    createdByUserId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    updatedByUserId: { type: Types.ObjectId, ref: "User", default: null },

    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

WorkspaceSchema.index({ createdByUserId: 1, createdAt: -1 });

applyToJsonTransform(WorkspaceSchema);

export type WorkspaceDoc = InferSchemaType<typeof WorkspaceSchema>;

export const WorkspaceModel: Model<WorkspaceDoc> =
  mongoose.models.Workspace ||
  mongoose.model<WorkspaceDoc>("Workspace", WorkspaceSchema);
