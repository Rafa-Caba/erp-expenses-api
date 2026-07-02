// src/debts/types/debts.types.ts
// Debt domain types for API contracts and service inputs.
// Phase 8 adds optional payment plan/installment fields for debts that are
// paid or collected in scheduled installments.

import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";
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
    "monthly",
    "yearly",
] as const;
export type DebtInstallmentFrequency =
    (typeof DEBT_INSTALLMENT_FREQUENCY_VALUES)[number];

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
    installmentFrequency?: DebtInstallmentFrequency | null;
    totalInstallments?: number | null;
    paidInstallments?: number | null;
    remainingInstallments?: number | null;
    paymentDay?: number | null;
    nextDueDate?: Date | null;
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
    installmentFrequency?: DebtInstallmentFrequency | null;
    totalInstallments?: number | null;
    paidInstallments?: number | null;
    paymentDay?: number | null;
    nextDueDate?: string | null;
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
    installmentFrequency?: DebtInstallmentFrequency | null;
    totalInstallments?: number | null;
    paidInstallments?: number | null;
    paymentDay?: number | null;
    nextDueDate?: string | null;
    notes?: string | null;
    isVisible?: boolean;
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