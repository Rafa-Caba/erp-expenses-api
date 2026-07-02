// src/payments/models/Payment.model.ts

import { Schema, model, type Model } from "mongoose";

import type {
    CashflowDirection,
    CurrencyCode,
} from "@/src/shared/types/common";
import type { PaymentDocument } from "../types/payments.types";
import {
    PAYMENT_METHOD_VALUES,
    PAYMENT_STATUS_VALUES,
} from "../types/payments.types";

const CURRENCY_VALUES: CurrencyCode[] = ["MXN", "USD"];
const CASHFLOW_DIRECTION_VALUES: CashflowDirection[] = ["in", "out"];

const paymentSchema = new Schema<PaymentDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
        },
        debtId: {
            type: Schema.Types.ObjectId,
            ref: "Debt",
            required: true,
        },
        accountId: {
            type: Schema.Types.ObjectId,
            ref: "Account",
            default: null,
        },
        cardId: {
            type: Schema.Types.ObjectId,
            ref: "Card",
            default: null,
        },
        memberId: {
            type: Schema.Types.ObjectId,
            ref: "WorkspaceMember",
            default: null,
        },
        transactionId: {
            type: Schema.Types.ObjectId,
            ref: "Transaction",
            default: null,
        },
        amount: {
            type: Number,
            required: true,
            min: 0.01,
        },
        principalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        feeAmount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        cashflowDirection: {
            type: String,
            enum: CASHFLOW_DIRECTION_VALUES,
            required: true,
            trim: true,
        },
        currency: {
            type: String,
            enum: CURRENCY_VALUES,
            required: true,
            trim: true,
        },
        paymentDate: {
            type: Date,
            required: true,
        },
        method: {
            type: String,
            enum: PAYMENT_METHOD_VALUES,
            default: null,
            trim: true,
        },
        reference: {
            type: String,
            trim: true,
            maxlength: 120,
            default: null,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },
        status: {
            type: String,
            enum: PAYMENT_STATUS_VALUES,
            required: true,
            default: "completed",
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

paymentSchema.index({ workspaceId: 1, debtId: 1, paymentDate: -1 });
paymentSchema.index({ workspaceId: 1, cashflowDirection: 1, paymentDate: -1 });
paymentSchema.index({ workspaceId: 1, accountId: 1, paymentDate: -1 });
paymentSchema.index({ workspaceId: 1, cardId: 1, paymentDate: -1 });
paymentSchema.index({ workspaceId: 1, memberId: 1, paymentDate: -1 });
paymentSchema.index({ workspaceId: 1, transactionId: 1 });
paymentSchema.index({ workspaceId: 1, status: 1, paymentDate: -1 });
paymentSchema.index({ workspaceId: 1, currency: 1, paymentDate: -1 });
paymentSchema.index({ workspaceId: 1, isVisible: 1, createdAt: -1 });

export type PaymentModelType = Model<PaymentDocument>;

export const PaymentModel = model<PaymentDocument, PaymentModelType>(
    "Payment",
    paymentSchema
);
