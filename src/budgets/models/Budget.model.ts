import { Schema, model, type Model } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";
import type { BudgetDocument } from "../types/budgets.types";
import {
    BUDGET_PERIOD_TYPE_VALUES,
    BUDGET_STATUS_VALUES,
} from "../types/budgets.types";

const CURRENCY_VALUES: CurrencyCode[] = ["MXN", "USD"];

const budgetSchema = new Schema<BudgetDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        periodType: {
            type: String,
            enum: BUDGET_PERIOD_TYPE_VALUES,
            required: true,
            trim: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        limitAmount: {
            type: Number,
            required: true,
            min: 0.01,
        },
        currency: {
            type: String,
            enum: CURRENCY_VALUES,
            required: true,
            trim: true,
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            default: null,
        },
        memberId: {
            type: Schema.Types.ObjectId,
            ref: "WorkspaceMember",
            default: null,
        },
        alertPercent: {
            type: Number,
            min: 1,
            max: 100,
            default: null,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
        status: {
            type: String,
            enum: BUDGET_STATUS_VALUES,
            required: true,
            default: "active",
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

budgetSchema.index({ workspaceId: 1, isActive: 1, status: 1, startDate: -1 });
budgetSchema.index({ workspaceId: 1, periodType: 1, startDate: -1, endDate: -1 });
budgetSchema.index({ workspaceId: 1, categoryId: 1, isActive: 1 });
budgetSchema.index({ workspaceId: 1, memberId: 1, isActive: 1 });
budgetSchema.index({ workspaceId: 1, currency: 1, status: 1 });
budgetSchema.index({ workspaceId: 1, isVisible: 1, createdAt: -1 });
budgetSchema.index({ workspaceId: 1, name: 1 });

export type BudgetModelType = Model<BudgetDocument>;

export const BudgetModel = model<BudgetDocument, BudgetModelType>(
    "Budget",
    budgetSchema
);