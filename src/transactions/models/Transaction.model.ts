// src/transactions/models/Transaction.model.ts

import { Schema, model, type Model } from "mongoose";

import type { TransactionDocument } from "../types/transaction.types";
import { TRANSACTION_STATUS_VALUES } from "../types/transaction.types";
import type { CurrencyCode, TransactionType } from "@/src/shared/types/common";

const TRANSACTION_TYPE_VALUES: TransactionType[] = [
    "expense",
    "income",
    "debt_payment",
    "transfer",
    "adjustment",
];

const CURRENCY_VALUES: CurrencyCode[] = ["MXN", "USD"];

const transactionSchema = new Schema<TransactionDocument>(
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
        destinationAccountId: {
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
            required: true,
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            default: null,
        },
        type: {
            type: String,
            enum: TRANSACTION_TYPE_VALUES,
            required: true,
            trim: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            enum: CURRENCY_VALUES,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        merchant: {
            type: String,
            trim: true,
            maxlength: 120,
            default: null,
        },
        transactionDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: TRANSACTION_STATUS_VALUES,
            required: true,
            default: "posted",
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
        isRecurring: {
            type: Boolean,
            default: false,
        },
        recurrenceRule: {
            type: String,
            trim: true,
            maxlength: 255,
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
            required: true,
        },
        isArchived: {
            type: Boolean,
            default: false,
        },
        isVisible: {
            type: Boolean,
            default: true,
        },
        createdByUserId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

transactionSchema.index({ workspaceId: 1, transactionDate: -1 });
transactionSchema.index({ workspaceId: 1, type: 1, status: 1 });
transactionSchema.index({ workspaceId: 1, memberId: 1, transactionDate: -1 });
transactionSchema.index({ workspaceId: 1, accountId: 1, transactionDate: -1 });
transactionSchema.index({ workspaceId: 1, destinationAccountId: 1, transactionDate: -1 });
transactionSchema.index({ workspaceId: 1, cardId: 1, transactionDate: -1 });
transactionSchema.index({ workspaceId: 1, categoryId: 1, transactionDate: -1 });
transactionSchema.index({ workspaceId: 1, currency: 1, transactionDate: -1 });
transactionSchema.index({ workspaceId: 1, createdByUserId: 1, transactionDate: -1 });
transactionSchema.index({ workspaceId: 1, isArchived: 1, isActive: 1 });
transactionSchema.index({ workspaceId: 1, isVisible: 1, isActive: 1 });

export type TransactionModelType = Model<TransactionDocument>;

export const TransactionModel = model<TransactionDocument, TransactionModelType>(
    "Transaction",
    transactionSchema
);