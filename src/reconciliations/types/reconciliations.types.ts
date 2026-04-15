// src/reconciliations/types/reconciliations.types.ts

import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { CurrencyCode, TransactionType } from "@/src/shared/types/common";
import type { TransactionStatus } from "@/src/transactions/types/transaction.types";
import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";

export const RECONCILIATION_STATUS_VALUES = [
    "unreconciled",
    "reconciled",
    "exception",
] as const;

export type ReconciliationStatus =
    (typeof RECONCILIATION_STATUS_VALUES)[number];

export const RECONCILIATION_MATCH_METHOD_VALUES = [
    "manual",
    "imported",
    "automatic",
] as const;

export type ReconciliationMatchMethod =
    (typeof RECONCILIATION_MATCH_METHOD_VALUES)[number];

export const RECONCILIATION_ENTRY_SIDE_VALUES = [
    "account",
    "destination_account",
    "card",
] as const;

export type ReconciliationEntrySide =
    (typeof RECONCILIATION_ENTRY_SIDE_VALUES)[number];

export type ReconciliationDifferenceDirection = "match" | "over" | "under";

export interface ReconciliationDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    accountId: Types.ObjectId;
    cardId?: Types.ObjectId | null;
    memberId: Types.ObjectId;
    transactionId: Types.ObjectId;
    entrySide: ReconciliationEntrySide;

    transactionType: TransactionType;
    transactionStatus: TransactionStatus;
    transactionDescription: string;
    transactionDate: Date;
    transactionAmount: number;
    currency: CurrencyCode;

    expectedAmount: number;
    actualAmount: number;
    differenceAmount: number;

    statementDate?: Date | null;
    statementReference?: string | null;
    matchMethod: ReconciliationMatchMethod;
    status: ReconciliationStatus;
    notes?: string | null;

    reconciledAt?: Date | null;
    reconciledByUserId?: Types.ObjectId | null;

    isActive: boolean;
    isArchived?: boolean;
    isVisible?: boolean;

    createdAt: Date;
    updatedAt: Date;
}

export interface WorkspaceReconciliationParams extends ParamsDictionary {
    workspaceId: string;
}

export interface ReconciliationParams extends ParamsDictionary {
    workspaceId: string;
    reconciliationId: string;
}

export interface ReconciliationListQuery {
    accountId?: string;
    cardId?: string;
    memberId?: string;
    transactionId?: string;
    status?: ReconciliationStatus;
    currency?: CurrencyCode;
    entrySide?: ReconciliationEntrySide;
    matchMethod?: ReconciliationMatchMethod;
    includeArchived?: string;
    includeInactive?: string;
    includeHidden?: string;
    transactionDateFrom?: string;
    transactionDateTo?: string;
    reconciledFrom?: string;
    reconciledTo?: string;
    statementDateFrom?: string;
    statementDateTo?: string;
}

export interface CreateReconciliationBody {
    accountId: string;
    cardId?: string | null;
    transactionId: string;
    expectedAmount?: number;
    actualAmount?: number;
    statementDate?: string | null;
    statementReference?: string | null;
    matchMethod?: ReconciliationMatchMethod;
    status?: ReconciliationStatus;
    notes?: string | null;
    reconciledAt?: string | null;
    isVisible?: boolean;
}

export interface UpdateReconciliationBody {
    expectedAmount?: number;
    actualAmount?: number;
    statementDate?: string | null;
    statementReference?: string | null;
    matchMethod?: ReconciliationMatchMethod;
    status?: ReconciliationStatus;
    notes?: string | null;
    reconciledAt?: string | null;
    isActive?: boolean;
    isArchived?: boolean;
    isVisible?: boolean;
}

export interface ReconciliationResponseDto {
    id: string;
    workspaceId: string;
    accountId: string;
    accountName: string | null;
    cardId: string | null;
    cardName: string | null;
    memberId: string;
    memberDisplayName: string | null;
    transactionId: string;
    entrySide: ReconciliationEntrySide;

    transactionType: TransactionType;
    transactionStatus: TransactionStatus;
    transactionDescription: string;
    transactionDate: Date;
    transactionAmount: number;
    currency: CurrencyCode;

    expectedAmount: number;
    actualAmount: number;
    differenceAmount: number;
    differenceDirection: ReconciliationDifferenceDirection;

    statementDate: Date | null;
    statementReference: string | null;
    matchMethod: ReconciliationMatchMethod;
    status: ReconciliationStatus;
    notes: string | null;

    reconciledAt: Date | null;
    reconciledByUserId: string | null;

    isActive: boolean;
    isArchived: boolean;
    isVisible: boolean;

    createdAt: Date;
    updatedAt: Date;
}

export interface ReconciliationSummaryByAccountDto {
    accountId: string;
    accountName: string | null;
    totalCount: number;
    reconciledCount: number;
    unreconciledCount: number;
    exceptionCount: number;
    expectedAmount: number;
    actualAmount: number;
    differenceAmount: number;
}

export interface ReconciliationSummaryDto {
    totalCount: number;
    reconciledCount: number;
    unreconciledCount: number;
    exceptionCount: number;
    hiddenCount: number;
    archivedCount: number;
    inactiveCount: number;
    expectedAmount: number;
    actualAmount: number;
    differenceAmount: number;
    latestReconciledAt: Date | null;
    byAccount: ReconciliationSummaryByAccountDto[];
}

export interface CreateReconciliationServiceInput {
    workspaceId: Types.ObjectId;
    body: CreateReconciliationBody;
    workspace: WorkspaceDocument;
    reconciledByUserId?: Types.ObjectId | null;
}

export interface UpdateReconciliationServiceInput {
    workspaceId: Types.ObjectId;
    reconciliationId: Types.ObjectId;
    body: UpdateReconciliationBody;
    workspace: WorkspaceDocument;
    reconciledByUserId?: Types.ObjectId | null;
}

export interface DeleteReconciliationServiceInput {
    workspaceId: Types.ObjectId;
    reconciliationId: Types.ObjectId;
    workspace: WorkspaceDocument;
}