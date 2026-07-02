// src/debts/models/Debt.model.ts
// Mongo model for debts. Phase 8 adds optional payment plan fields so debts
// can track installment counts, expected payment amount, and next due date.

import { Schema, model, type Model } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";
import type { DebtDocument } from "../types/debts.types";
import {
    DEBT_INSTALLMENT_FREQUENCY_VALUES,
    DEBT_STATUS_VALUES,
    DEBT_TYPE_VALUES,
} from "../types/debts.types";

const currencyValues: CurrencyCode[] = ["MXN", "USD"];

const debtSchema = new Schema<DebtDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
        },
        memberId: {
            type: Schema.Types.ObjectId,
            ref: "WorkspaceMember",
            default: null,
        },
        relatedAccountId: {
            type: Schema.Types.ObjectId,
            ref: "Account",
            default: null,
        },
        type: {
            type: String,
            enum: DEBT_TYPE_VALUES,
            required: true,
            trim: true,
        },
        personName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        personContact: {
            type: String,
            trim: true,
            maxlength: 255,
            default: null,
        },

        originalAmount: {
            type: Number,
            required: true,
            min: 0.01,
        },
        remainingAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            enum: currencyValues,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },
        startDate: {
            type: Date,
            required: true,
        },
        dueDate: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: DEBT_STATUS_VALUES,
            required: true,
            trim: true,
            default: "active",
        },
        paymentPlanEnabled: {
            type: Boolean,
            required: true,
            default: false,
        },
        installmentAmount: {
            type: Number,
            min: 0,
            default: null,
        },
        installmentFrequency: {
            type: String,
            enum: DEBT_INSTALLMENT_FREQUENCY_VALUES,
            trim: true,
            default: null,
        },
        totalInstallments: {
            type: Number,
            min: 1,
            default: null,
        },
        paidInstallments: {
            type: Number,
            min: 0,
            default: null,
        },
        remainingInstallments: {
            type: Number,
            min: 0,
            default: null,
        },
        paymentDay: {
            type: Number,
            min: 1,
            max: 31,
            default: null,
        },
        nextDueDate: {
            type: Date,
            default: null,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
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

debtSchema.index({ workspaceId: 1, status: 1, dueDate: 1 });
debtSchema.index({ workspaceId: 1, type: 1, status: 1, startDate: -1 });
debtSchema.index({ workspaceId: 1, memberId: 1, status: 1 });
debtSchema.index({ workspaceId: 1, relatedAccountId: 1, status: 1 });
debtSchema.index({ workspaceId: 1, personName: 1 });
debtSchema.index({ workspaceId: 1, isVisible: 1, createdAt: -1 });
debtSchema.index({ workspaceId: 1, paymentPlanEnabled: 1, nextDueDate: 1 });

export type DebtModelType = Model<DebtDocument>;

export const DebtModel = model<DebtDocument, DebtModelType>(
    "Debt",
    debtSchema
);