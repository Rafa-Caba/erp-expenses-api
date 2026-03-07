// src/transactions/types/transactions.types.ts

import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { CurrencyCode, TransactionType } from "@/src/shared/types/common";
import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";

export const TRANSACTION_STATUS_VALUES = ["pending", "posted", "cancelled"] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUS_VALUES)[number];

export const RECURRENCE_FREQUENCY_VALUES = [
    "daily",
    "weekly",
    "bi-weekly",
    "monthly",
    "yearly",
] as const;

export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCY_VALUES)[number];

export interface TransactionDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    accountId?: Types.ObjectId | null;
    destinationAccountId?: Types.ObjectId | null;
    cardId?: Types.ObjectId | null;
    memberId: Types.ObjectId;
    categoryId?: Types.ObjectId | null;
    type: TransactionType;
    amount: number;
    currency: CurrencyCode;
    description: string;
    merchant?: string | null;
    transactionDate: Date;
    status: TransactionStatus;
    reference?: string | null;
    notes?: string | null;
    isRecurring?: boolean;
    recurrenceRule?: string | null;
    isActive: boolean;
    isArchived?: boolean;
    isVisible?: boolean;
    createdByUserId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkspaceTransactionParams extends ParamsDictionary {
    workspaceId: string;
}

export interface TransactionParams extends ParamsDictionary {
    workspaceId: string;
    transactionId: string;
}

export interface CreateTransactionBody {
    accountId?: string | null;
    destinationAccountId?: string | null;
    cardId?: string | null;
    memberId: string;
    categoryId?: string | null;
    type: TransactionType;
    amount: number;
    currency: CurrencyCode;
    description: string;
    merchant?: string | null;
    transactionDate: string;
    status?: TransactionStatus;
    reference?: string | null;
    notes?: string | null;
    isRecurring?: boolean;
    recurrenceRule?: string | null;
    isVisible?: boolean;
    createdByUserId: string;
}

export interface UpdateTransactionBody {
    accountId?: string | null;
    destinationAccountId?: string | null;
    cardId?: string | null;
    memberId?: string;
    categoryId?: string | null;
    type?: TransactionType;
    amount?: number;
    currency?: CurrencyCode;
    description?: string;
    merchant?: string | null;
    transactionDate?: string;
    status?: TransactionStatus;
    reference?: string | null;
    notes?: string | null;
    isRecurring?: boolean;
    recurrenceRule?: string | null;
    isActive?: boolean;
    isArchived?: boolean;
    isVisible?: boolean;
}

export interface CreateTransactionServiceInput {
    workspaceId: Types.ObjectId;
    body: CreateTransactionBody;
    workspace: WorkspaceDocument;
}

export interface UpdateTransactionServiceInput {
    workspaceId: Types.ObjectId;
    transactionId: Types.ObjectId;
    body: UpdateTransactionBody;
    workspace: WorkspaceDocument;
}

export interface ArchiveTransactionServiceInput {
    workspaceId: Types.ObjectId;
    transactionId: Types.ObjectId;
    workspace: WorkspaceDocument;
}