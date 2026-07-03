// src/debts/types/debts.types.ts
// Debt domain types for API contracts and service inputs.
// Phase 10 adds debt payment plan automation contracts.

import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";
import type { PaymentDocument } from "@/src/payments/types/payments.types";
import type { TransactionDocument } from "@/src/transactions/types/transaction.types";
import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";

export const DEBT_TYPE_VALUES = ["owed_by_me", "owed_to_me"] as const;
export type DebtType = (typeof DEBT_TYPE_VALUES)[number];

export const DEBT_STATUS_VALUES = [
    "active",
    "paid",
    "overdue",
    "cancelled",
] as const;
export type DebtStatus = (typeof DEBT_STATUS_VALUES)[number];

export const DEBT_INSTALLMENT_FREQUENCY_VALUES = [
    "weekly",
    "biweekly",
    "semimonthly",
    "monthly",
    "yearly",
] as const;
export type DebtInstallmentFrequency =
    (typeof DEBT_INSTALLMENT_FREQUENCY_VALUES)[number];

export const DEBT_PROCESS_DUE_PAYMENT_ACTION_VALUES = [
    "would_create",
    "created",
    "skipped_duplicate",
    "skipped_missing_account",
    "skipped_missing_member",
    "skipped_invalid_plan",
    "skipped_paid",
    "skipped_inactive",
] as const;
export type DebtProcessDuePaymentAction =
    (typeof DEBT_PROCESS_DUE_PAYMENT_ACTION_VALUES)[number];

export interface DebtDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    memberId?: Types.ObjectId | null;
    relatedAccountId?: Types.ObjectId | null;
    type: DebtType;
    personName: string;
    personContact?: string | null;
    originalAmount: number;
    remainingAmount: number;
    currency: CurrencyCode;
    description: string;
    startDate: Date;
    dueDate?: Date | null;
    status: DebtStatus;
    paymentPlanEnabled?: boolean;
    installmentAmount?: number | null;
    expectedPrincipalAmount?: number | null;
    expectedFeeAmount?: number | null;
    installmentFrequency?: DebtInstallmentFrequency | null;
    totalInstallments?: number | null;
    paidInstallments?: number | null;
    remainingInstallments?: number | null;
    paymentDay?: number | null;
    nextDueDate?: Date | null;
    autoGeneratePayments?: boolean;
    lastGeneratedPaymentId?: Types.ObjectId | null;
    lastGeneratedTransactionId?: Types.ObjectId | null;
    notes?: string | null;
    isVisible?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkspaceDebtParams extends ParamsDictionary {
    workspaceId: string;
}

export interface DebtParams extends ParamsDictionary {
    workspaceId: string;
    debtId: string;
}

export interface CreateDebtBody {
    memberId?: string | null;
    relatedAccountId?: string | null;
    type: DebtType;
    personName: string;
    personContact?: string | null;
    originalAmount: number;
    remainingAmount: number;
    currency: CurrencyCode;
    description: string;
    startDate: string;
    dueDate?: string | null;
    status?: DebtStatus;
    paymentPlanEnabled?: boolean;
    installmentAmount?: number | null;
    expectedPrincipalAmount?: number | null;
    expectedFeeAmount?: number | null;
    installmentFrequency?: DebtInstallmentFrequency | null;
    totalInstallments?: number | null;
    paidInstallments?: number | null;
    paymentDay?: number | null;
    nextDueDate?: string | null;
    autoGeneratePayments?: boolean;
    notes?: string | null;
    isVisible?: boolean;
}

export interface UpdateDebtBody {
    memberId?: string | null;
    relatedAccountId?: string | null;
    type?: DebtType;
    personName?: string;
    personContact?: string | null;
    originalAmount?: number;
    remainingAmount?: number;
    currency?: CurrencyCode;
    description?: string;
    startDate?: string;
    dueDate?: string | null;
    status?: DebtStatus;
    paymentPlanEnabled?: boolean;
    installmentAmount?: number | null;
    expectedPrincipalAmount?: number | null;
    expectedFeeAmount?: number | null;
    installmentFrequency?: DebtInstallmentFrequency | null;
    totalInstallments?: number | null;
    paidInstallments?: number | null;
    paymentDay?: number | null;
    nextDueDate?: string | null;
    autoGeneratePayments?: boolean;
    notes?: string | null;
    isVisible?: boolean;
}

export interface ProcessDueDebtPaymentsBody {
    asOfDate?: string;
    dryRun?: boolean;
    limit?: number;
}

export interface ProcessDueDebtPaymentItem {
    debtId: Types.ObjectId;
    debtName: string;
    scheduledPaymentDate: Date;
    nextDueDate: Date | null;
    action: DebtProcessDuePaymentAction;
    reason: string | null;
    transactionId: Types.ObjectId | null;
    paymentId: Types.ObjectId | null;
    amount: number;
    principalAmount: number;
    feeAmount: number;
}

export interface ProcessDueDebtPaymentsResult {
    dryRun: boolean;
    asOfDate: Date;
    scannedCount: number;
    dueCount: number;
    generatedCount: number;
    skippedCount: number;
    items: ProcessDueDebtPaymentItem[];
}

export interface DebtGeneratedPaymentResult {
    debt: DebtDocument;
    transaction: TransactionDocument;
    payment: PaymentDocument;
}

export interface CreateDebtServiceInput {
    workspaceId: Types.ObjectId;
    body: CreateDebtBody;
    workspace: WorkspaceDocument;
}

export interface UpdateDebtServiceInput {
    workspaceId: Types.ObjectId;
    debtId: Types.ObjectId;
    body: UpdateDebtBody;
    workspace: WorkspaceDocument;
}

export interface DeleteDebtServiceInput {
    workspaceId: Types.ObjectId;
    debtId: Types.ObjectId;
    workspace: WorkspaceDocument;
}

export interface ProcessDueDebtPaymentsServiceInput {
    workspaceId: Types.ObjectId;
    createdByUserId?: Types.ObjectId | null;
    body: ProcessDueDebtPaymentsBody;
    workspace: WorkspaceDocument;
}