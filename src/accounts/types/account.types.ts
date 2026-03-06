// src/accounts/types/account.types.ts

import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { CurrencyCode } from "@/src/shared/types/common";

export type AccountType = "cash" | "bank" | "wallet" | "savings" | "credit";

export interface WorkspaceAccountParams extends ParamsDictionary {
    workspaceId: string;
}

export interface AccountParams extends ParamsDictionary {
    workspaceId: string;
    accountId: string;
}

export interface CreateAccountBody {
    ownerMemberId?: string;
    name: string;
    type: AccountType;
    bankName?: string;
    accountNumberMasked?: string;
    currency: CurrencyCode;
    initialBalance: number;
    currentBalance?: number;
    creditLimit?: number;
    statementClosingDay?: number;
    paymentDueDay?: number;
    notes?: string;
    isActive?: boolean;
    isArchived?: boolean;
    isVisible?: boolean;
}

export interface UpdateAccountBody {
    ownerMemberId?: string;
    name?: string;
    type?: AccountType;
    bankName?: string;
    accountNumberMasked?: string;
    currency?: CurrencyCode;
    initialBalance?: number;
    currentBalance?: number;
    creditLimit?: number;
    statementClosingDay?: number;
    paymentDueDay?: number;
    notes?: string;
    isActive?: boolean;
    isArchived?: boolean;
    isVisible?: boolean;
}

export interface AccountResponseDto {
    id: string;
    workspaceId: string;
    ownerMemberId: string | null;
    name: string;
    type: AccountType;
    bankName: string | null;
    accountNumberMasked: string | null;
    currency: CurrencyCode;
    initialBalance: number;
    currentBalance: number;
    creditLimit: number | null;
    statementClosingDay: number | null;
    paymentDueDay: number | null;
    notes: string | null;
    isActive: boolean;
    isArchived: boolean;
    isVisible: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateAccountServiceInput {
    workspaceId: Types.ObjectId;
    body: CreateAccountBody;
}

export interface UpdateAccountServiceInput {
    workspaceId: Types.ObjectId;
    accountId: Types.ObjectId;
    body: UpdateAccountBody;
}