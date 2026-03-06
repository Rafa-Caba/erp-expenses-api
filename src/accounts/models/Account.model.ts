// src/accounts/models/Account.model.ts

import { Schema, model, type Model, type Types } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";
import type { AccountType } from "../types/account.types";

export interface AccountDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    ownerMemberId?: Types.ObjectId | null;
    name: string;
    type: AccountType;
    bankName?: string | null;
    accountNumberMasked?: string | null;
    currency: CurrencyCode;
    initialBalance: number;
    currentBalance: number;
    creditLimit?: number | null;
    statementClosingDay?: number | null;
    paymentDueDay?: number | null;
    notes?: string | null;
    isActive: boolean;
    isArchived?: boolean;
    isVisible?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const accountSchema = new Schema<AccountDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        ownerMemberId: {
            type: Schema.Types.ObjectId,
            ref: "WorkspaceMember",
            default: null,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        type: {
            type: String,
            enum: ["cash", "bank", "wallet", "savings", "credit"],
            required: true,
            trim: true,
        },
        bankName: {
            type: String,
            trim: true,
            maxlength: 120,
            default: null,
        },
        accountNumberMasked: {
            type: String,
            trim: true,
            maxlength: 30,
            default: null,
        },
        currency: {
            type: String,
            enum: ["MXN", "USD"],
            required: true,
            trim: true,
        },
        initialBalance: {
            type: Number,
            required: true,
            default: 0,
        },
        currentBalance: {
            type: Number,
            required: true,
            default: 0,
        },
        creditLimit: {
            type: Number,
            default: null,
            min: 0,
        },
        statementClosingDay: {
            type: Number,
            default: null,
            min: 1,
            max: 31,
        },
        paymentDueDay: {
            type: Number,
            default: null,
            min: 1,
            max: 31,
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

accountSchema.index({ workspaceId: 1, isArchived: 1 });
accountSchema.index({ workspaceId: 1, isActive: 1 });
accountSchema.index({ workspaceId: 1, type: 1 });
accountSchema.index({ workspaceId: 1, ownerMemberId: 1 });
accountSchema.index({ workspaceId: 1, name: 1 });

export type AccountModelType = Model<AccountDocument>;

export const AccountModel = model<AccountDocument, AccountModelType>(
    "Account",
    accountSchema
);