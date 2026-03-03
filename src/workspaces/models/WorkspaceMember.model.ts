// src/workspaces/models/WorkspaceMember.model.ts

import mongoose, {
  Schema,
  type InferSchemaType,
  type Model,
  Types,
} from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";
import type { MemberRole, MemberStatus } from "@/src/shared/types/common";

const WorkspaceMemberSchema = new Schema(
  {
    workspaceId: {
      type: Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },

    role: {
      type: String,
      required: true,
      enum: ["OWNER", "ADMIN", "MEMBER", "VIEWER"] satisfies MemberRole[],
    },

    status: {
      type: String,
      required: true,
      enum: ["active", "invited", "disabled"] satisfies MemberStatus[],
      default: "active",
    },

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

// A user can have only one membership per workspace
WorkspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

// Helpful for listing members
WorkspaceMemberSchema.index({ workspaceId: 1, status: 1, role: 1 });

applyToJsonTransform(WorkspaceMemberSchema);

export type WorkspaceMemberDoc = InferSchemaType<typeof WorkspaceMemberSchema>;

export const WorkspaceMemberModel: Model<WorkspaceMemberDoc> =
  mongoose.models.WorkspaceMember ||
  mongoose.model<WorkspaceMemberDoc>("WorkspaceMember", WorkspaceMemberSchema);
