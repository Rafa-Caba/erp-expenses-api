// src/subscriptions/models/Subscription.model.ts
// Mongo model for subscriptions/recurring expenses.

import { Schema, model, type Model } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";
import type { SubscriptionDocument } from "../types/subscription.types";
import {
    SUBSCRIPTION_BILLING_FREQUENCY_VALUES,
    SUBSCRIPTION_STATUS_VALUES,
} from "../types/subscription.types";

const currencyValues: CurrencyCode[] = ["MXN", "USD"];

const subscriptionSchema = new Schema<SubscriptionDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        memberId: {
            type: Schema.Types.ObjectId,
            ref: "WorkspaceMember",
            required: true,
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: "Category",
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
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160,
        },
        merchant: {
            type: String,
            trim: true,
            maxlength: 160,
            default: null,
        },
        amount: {
            type: Number,
            required: true,
            min: 0.01,
        },
        currency: {
            type: String,
            enum: currencyValues,
            required: true,
            trim: true,
        },
        billingFrequency: {
            type: String,
            enum: SUBSCRIPTION_BILLING_FREQUENCY_VALUES,
            required: true,
            trim: true,
        },
        billingDay: {
            type: Number,
            min: 1,
            max: 31,
            default: null,
        },
        startDate: {
            type: Date,
            required: true,
        },
        nextBillingDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: SUBSCRIPTION_STATUS_VALUES,
            required: true,
            default: "active",
            trim: true,
        },
        autoCreateTransaction: {
            type: Boolean,
            required: true,
            default: false,
        },
        lastTransactionId: {
            type: Schema.Types.ObjectId,
            ref: "Transaction",
            default: null,
        },
        legacyRecurringTransactionId: {
            type: Schema.Types.ObjectId,
            ref: "Transaction",
            default: null,
        },
        migrationSource: {
            type: String,
            enum: ["recurring_transaction"],
            default: null,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },
        isVisible: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

subscriptionSchema.index({ workspaceId: 1, status: 1, nextBillingDate: 1 });
subscriptionSchema.index({ workspaceId: 1, memberId: 1, status: 1 });
subscriptionSchema.index({ workspaceId: 1, categoryId: 1, status: 1 });
subscriptionSchema.index({ workspaceId: 1, accountId: 1, status: 1 });
subscriptionSchema.index({ workspaceId: 1, cardId: 1, status: 1 });
subscriptionSchema.index({ workspaceId: 1, isVisible: 1, createdAt: -1 });
subscriptionSchema.index(
    { workspaceId: 1, legacyRecurringTransactionId: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: {
            legacyRecurringTransactionId: { $type: "objectId" },
        },
    }
);

export type SubscriptionModelType = Model<SubscriptionDocument>;

export const SubscriptionModel = model<SubscriptionDocument, SubscriptionModelType>(
    "Subscription",
    subscriptionSchema
);