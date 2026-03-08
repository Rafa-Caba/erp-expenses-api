import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";
import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";

export const PAYMENT_STATUS_VALUES = [
    "pending",
    "completed",
    "failed",
    "cancelled",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];

export const PAYMENT_METHOD_VALUES = [
    "cash",
    "bank_transfer",
    "card",
    "check",
    "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number];

export interface PaymentDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    debtId: Types.ObjectId;
    accountId?: Types.ObjectId | null;
    cardId?: Types.ObjectId | null;
    memberId?: Types.ObjectId | null;
    transactionId?: Types.ObjectId | null;
    amount: number;
    currency: CurrencyCode;
    paymentDate: Date;
    method?: PaymentMethod | null;
    reference?: string | null;
    notes?: string | null;
    status: PaymentStatus;
    isVisible?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkspacePaymentParams extends ParamsDictionary {
    workspaceId: string;
}

export interface PaymentParams extends ParamsDictionary {
    workspaceId: string;
    paymentId: string;
}

export interface CreatePaymentBody {
    debtId: string;
    accountId?: string | null;
    cardId?: string | null;
    memberId?: string | null;
    transactionId?: string | null;
    amount: number;
    currency: CurrencyCode;
    paymentDate: string;
    method?: PaymentMethod | null;
    reference?: string | null;
    notes?: string | null;
    status?: PaymentStatus;
    isVisible?: boolean;
}

export interface UpdatePaymentBody {
    debtId?: string;
    accountId?: string | null;
    cardId?: string | null;
    memberId?: string | null;
    transactionId?: string | null;
    amount?: number;
    currency?: CurrencyCode;
    paymentDate?: string;
    method?: PaymentMethod | null;
    reference?: string | null;
    notes?: string | null;
    status?: PaymentStatus;
    isVisible?: boolean;
}

export interface CreatePaymentServiceInput {
    workspaceId: Types.ObjectId;
    body: CreatePaymentBody;
    workspace: WorkspaceDocument;
}

export interface UpdatePaymentServiceInput {
    workspaceId: Types.ObjectId;
    paymentId: Types.ObjectId;
    body: UpdatePaymentBody;
    workspace: WorkspaceDocument;
}

export interface DeletePaymentServiceInput {
    workspaceId: Types.ObjectId;
    paymentId: Types.ObjectId;
    workspace: WorkspaceDocument;
}