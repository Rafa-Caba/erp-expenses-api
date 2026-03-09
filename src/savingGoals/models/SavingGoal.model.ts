import { Schema, model, type Model } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";
import type { SavingsGoalDocument } from "../types/savingGoals.types";
import {
    SAVINGS_GOAL_CATEGORY_VALUES,
    SAVINGS_GOAL_PRIORITY_VALUES,
    SAVINGS_GOAL_STATUS_VALUES,
} from "../types/savingGoals.types";

const CURRENCY_VALUES: CurrencyCode[] = ["MXN", "USD"];

const savingGoalSchema = new Schema<SavingsGoalDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
        },
        accountId: {
            type: Schema.Types.ObjectId,
            ref: "Account",
            default: null,
        },
        memberId: {
            type: Schema.Types.ObjectId,
            ref: "WorkspaceMember",
            default: null,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },
        targetAmount: {
            type: Number,
            required: true,
            min: 0.01,
        },
        currentAmount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        currency: {
            type: String,
            enum: CURRENCY_VALUES,
            required: true,
            trim: true,
        },
        targetDate: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: SAVINGS_GOAL_STATUS_VALUES,
            required: true,
            default: "active",
            trim: true,
        },
        priority: {
            type: String,
            enum: SAVINGS_GOAL_PRIORITY_VALUES,
            default: null,
            trim: true,
        },
        category: {
            type: String,
            enum: SAVINGS_GOAL_CATEGORY_VALUES,
            required: true,
            default: "custom",
            trim: true,
        },
        isVisible: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

savingGoalSchema.index({ workspaceId: 1, status: 1, targetDate: 1 });
savingGoalSchema.index({ workspaceId: 1, accountId: 1, status: 1 });
savingGoalSchema.index({ workspaceId: 1, memberId: 1, status: 1 });
savingGoalSchema.index({ workspaceId: 1, currency: 1, status: 1 });
savingGoalSchema.index({ workspaceId: 1, priority: 1, status: 1 });
savingGoalSchema.index({ workspaceId: 1, category: 1, status: 1 });
savingGoalSchema.index({ workspaceId: 1, isVisible: 1, createdAt: -1 });
savingGoalSchema.index({ workspaceId: 1, name: 1 });

export type SavingGoalModelType = Model<SavingsGoalDocument>;

export const SavingGoalModel = model<SavingsGoalDocument, SavingGoalModelType>(
    "SavingGoal",
    savingGoalSchema
);