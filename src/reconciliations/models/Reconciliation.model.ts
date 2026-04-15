// src/reconciliations/models/Reconciliation.model.ts

import { Schema, model, type Model } from "mongoose";

import type { CurrencyCode, TransactionType } from "@/src/shared/types/common";
import type { TransactionStatus } from "@/src/transactions/types/transaction.types";
import type { ReconciliationDocument } from "../types/reconciliations.types";
import {
    RECONCILIATION_ENTRY_SIDE_VALUES,
    RECONCILIATION_MATCH_METHOD_VALUES,
    RECONCILIATION_STATUS_VALUES,
} from "../types/reconciliations.types";

const CURRENCY_VALUES: CurrencyCode[] = ["MXN", "USD"];

const TRANSACTION_TYPE_VALUES: TransactionType[] = [
    "expense",
    "income",
    "debt_payment",
    "transfer",
    "adjustment",
];

const TRANSACTION_STATUS_VALUES: TransactionStatus[] = [
    "pending",
    "posted",
    "cancelled",
];

const reconciliationSchema = new Schema<ReconciliationDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
        },
        accountId: {
            type: Schema.Types.ObjectId,
            ref: "Account",
            required: true,
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
        transactionId: {
            type: Schema.Types.ObjectId,
            ref: "Transaction",
            required: true,
        },
        entrySide: {
            type: String,
            enum: RECONCILIATION_ENTRY_SIDE_VALUES,
            required: true,
            trim: true,
        },

        transactionType: {
            type: String,
            enum: TRANSACTION_TYPE_VALUES,
            required: true,
            trim: true,
        },
        transactionStatus: {
            type: String,
            enum: TRANSACTION_STATUS_VALUES,
            required: true,
            trim: true,
        },
        transactionDescription: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        transactionDate: {
            type: Date,
            required: true,
        },
        transactionAmount: {
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

        expectedAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        actualAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        differenceAmount: {
            type: Number,
            required: true,
        },

        statementDate: {
            type: Date,
            default: null,
        },
        statementReference: {
            type: String,
            trim: true,
            maxlength: 120,
            default: null,
        },
        matchMethod: {
            type: String,
            enum: RECONCILIATION_MATCH_METHOD_VALUES,
            required: true,
            default: "manual",
            trim: true,
        },
        status: {
            type: String,
            enum: RECONCILIATION_STATUS_VALUES,
            required: true,
            default: "reconciled",
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },

        reconciledAt: {
            type: Date,
            default: null,
        },
        reconciledByUserId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
        isArchived: {
            type: Boolean,
            default: false,
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

reconciliationSchema.index(
    { workspaceId: 1, transactionId: 1, accountId: 1, entrySide: 1 },
    { unique: true }
);
reconciliationSchema.index({ workspaceId: 1, accountId: 1, status: 1, transactionDate: -1 });
reconciliationSchema.index({ workspaceId: 1, cardId: 1, status: 1, transactionDate: -1 });
reconciliationSchema.index({ workspaceId: 1, memberId: 1, transactionDate: -1 });
reconciliationSchema.index({ workspaceId: 1, transactionId: 1 });
reconciliationSchema.index({ workspaceId: 1, currency: 1, transactionDate: -1 });
reconciliationSchema.index({ workspaceId: 1, reconciledAt: -1 });
reconciliationSchema.index({ workspaceId: 1, statementDate: -1 });
reconciliationSchema.index({ workspaceId: 1, isArchived: 1, isActive: 1 });
reconciliationSchema.index({ workspaceId: 1, isVisible: 1, isActive: 1 });

export type ReconciliationModelType = Model<ReconciliationDocument>;

export const ReconciliationModel = model<
    ReconciliationDocument,
    ReconciliationModelType
>("Reconciliation", reconciliationSchema);