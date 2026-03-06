// src/cards/types/card.types.ts

import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

export type CardType = "debit" | "credit";

export interface WorkspaceCardParams extends ParamsDictionary {
    workspaceId: string;
}

export interface CardParams extends ParamsDictionary {
    workspaceId: string;
    cardId: string;
}

export interface CreateCardBody {
    accountId: string;
    holderMemberId?: string;
    name: string;
    type: CardType;
    brand?: string;
    last4: string;
    creditLimit?: number;
    closingDay?: number;
    dueDay?: number;
    notes?: string;
    isActive?: boolean;
    isArchived?: boolean;
    isVisible?: boolean;
}

export interface UpdateCardBody {
    accountId?: string;
    holderMemberId?: string;
    name?: string;
    type?: CardType;
    brand?: string;
    last4?: string;
    creditLimit?: number;
    closingDay?: number;
    dueDay?: number;
    notes?: string;
    isActive?: boolean;
    isArchived?: boolean;
    isVisible?: boolean;
}

export interface CardResponseDto {
    id: string;
    workspaceId: string;
    accountId: string;
    holderMemberId: string | null;
    name: string;
    type: CardType;
    brand: string | null;
    last4: string;
    creditLimit: number | null;
    closingDay: number | null;
    dueDay: number | null;
    notes: string | null;
    isActive: boolean;
    isArchived: boolean;
    isVisible: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateCardServiceInput {
    workspaceId: Types.ObjectId;
    body: CreateCardBody;
}

export interface UpdateCardServiceInput {
    workspaceId: Types.ObjectId;
    cardId: Types.ObjectId;
    body: UpdateCardBody;
}