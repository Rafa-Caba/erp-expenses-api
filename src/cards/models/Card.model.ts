// src/cards/models/Card.model.ts

import { Schema, model, type Model, type Types } from "mongoose";

import type { CardType } from "../types/card.types";

export interface CardDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    accountId: Types.ObjectId;
    holderMemberId?: Types.ObjectId | null;
    name: string;
    type: CardType;
    brand?: string | null;
    last4: string;
    creditLimit?: number | null;
    closingDay?: number | null;
    dueDay?: number | null;
    notes?: string | null;
    isActive: boolean;
    isArchived?: boolean;
    isVisible?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const cardSchema = new Schema<CardDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        accountId: {
            type: Schema.Types.ObjectId,
            ref: "Account",
            required: true,
            index: true,
        },
        holderMemberId: {
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
            enum: ["debit", "credit"],
            required: true,
            trim: true,
        },
        brand: {
            type: String,
            trim: true,
            maxlength: 60,
            default: null,
        },
        last4: {
            type: String,
            required: true,
            trim: true,
            minlength: 4,
            maxlength: 4,
        },
        creditLimit: {
            type: Number,
            default: null,
            min: 0,
        },
        closingDay: {
            type: Number,
            default: null,
            min: 1,
            max: 31,
        },
        dueDay: {
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

cardSchema.index({ workspaceId: 1, isArchived: 1 });
cardSchema.index({ workspaceId: 1, isActive: 1 });
cardSchema.index({ workspaceId: 1, accountId: 1 });
cardSchema.index({ workspaceId: 1, holderMemberId: 1 });
cardSchema.index({ workspaceId: 1, type: 1 });
cardSchema.index({ workspaceId: 1, last4: 1 });

export type CardModelType = Model<CardDocument>;

export const CardModel = model<CardDocument, CardModelType>(
    "Card",
    cardSchema
);