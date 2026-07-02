// src/subscriptions/types/subscription.types.ts
// API contracts for subscription/recurring expense records.
// Phase 9A keeps subscriptions separate from debts: subscriptions track
// expected recurring expenses and can create reviewed expense transactions.

import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";
import type { TransactionStatus } from "@/src/transactions/types/transaction.types";
import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";

export const SUBSCRIPTION_STATUS_VALUES = [
    "active",
    "paused",
    "cancelled",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS_VALUES)[number];

export const SUBSCRIPTION_BILLING_FREQUENCY_VALUES = [
    "weekly",
    "biweekly",
    "monthly",
    "yearly",
] as const;
export type SubscriptionBillingFrequency =
    (typeof SUBSCRIPTION_BILLING_FREQUENCY_VALUES)[number];

export interface SubscriptionDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    memberId: Types.ObjectId;
    categoryId: Types.ObjectId;
    accountId?: Types.ObjectId | null;
    cardId?: Types.ObjectId | null;
    name: string;
    merchant?: string | null;
    amount: number;
    currency: CurrencyCode;
    billingFrequency: SubscriptionBillingFrequency;
    billingDay?: number | null;
    startDate: Date;
    nextBillingDate: Date;
    endDate?: Date | null;
    status: SubscriptionStatus;
    autoCreateTransaction: boolean;
    lastTransactionId?: Types.ObjectId | null;
    notes?: string | null;
    isVisible: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkspaceSubscriptionParams extends ParamsDictionary {
    workspaceId: string;
}

export interface SubscriptionParams extends ParamsDictionary {
    workspaceId: string;
    subscriptionId: string;
}

export interface CreateSubscriptionBody {
    memberId: string;
    categoryId: string;
    accountId?: string | null;
    cardId?: string | null;
    name: string;
    merchant?: string | null;
    amount: number;
    currency: CurrencyCode;
    billingFrequency: SubscriptionBillingFrequency;
    billingDay?: number | null;
    startDate: string;
    nextBillingDate: string;
    endDate?: string | null;
    status?: SubscriptionStatus;
    autoCreateTransaction?: boolean;
    notes?: string | null;
    isVisible?: boolean;
}

export interface UpdateSubscriptionBody {
    memberId?: string;
    categoryId?: string;
    accountId?: string | null;
    cardId?: string | null;
    name?: string;
    merchant?: string | null;
    amount?: number;
    currency?: CurrencyCode;
    billingFrequency?: SubscriptionBillingFrequency;
    billingDay?: number | null;
    startDate?: string;
    nextBillingDate?: string;
    endDate?: string | null;
    status?: SubscriptionStatus;
    autoCreateTransaction?: boolean;
    lastTransactionId?: string | null;
    notes?: string | null;
    isVisible?: boolean;
}

export interface CreateSubscriptionTransactionBody {
    transactionDate?: string;
    status?: TransactionStatus;
    reference?: string | null;
    notes?: string | null;
}

export interface CreateSubscriptionServiceInput {
    workspaceId: Types.ObjectId;
    body: CreateSubscriptionBody;
    workspace: WorkspaceDocument;
}

export interface UpdateSubscriptionServiceInput {
    workspaceId: Types.ObjectId;
    subscriptionId: Types.ObjectId;
    body: UpdateSubscriptionBody;
    workspace: WorkspaceDocument;
}

export interface DeleteSubscriptionServiceInput {
    workspaceId: Types.ObjectId;
    subscriptionId: Types.ObjectId;
    workspace: WorkspaceDocument;
}

export interface CreateSubscriptionTransactionServiceInput {
    workspaceId: Types.ObjectId;
    subscriptionId: Types.ObjectId;
    createdByUserId: Types.ObjectId;
    body: CreateSubscriptionTransactionBody;
    workspace: WorkspaceDocument;
}