// src/receipts/models/Receipt.model.ts

import { Schema, model, type Model } from "mongoose";

import type { ReceiptDocument } from "../types/receipts.types";
import { RECEIPT_FILE_TYPE_VALUES } from "../types/receipts.types";

const receiptSchema = new Schema<ReceiptDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
        },
        transactionId: {
            type: Schema.Types.ObjectId,
            ref: "Transaction",
            required: true,
        },
        fileUrl: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },
        fileName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        fileType: {
            type: String,
            enum: RECEIPT_FILE_TYPE_VALUES,
            required: true,
            trim: true,
        },
        fileSize: {
            type: Number,
            default: null,
            min: 0,
        },
        filePublicId: {
            type: String,
            trim: true,
            maxlength: 255,
            default: null,
        },
        uploadedByMemberId: {
            type: Schema.Types.ObjectId,
            ref: "WorkspaceMember",
            required: true,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },
        isVisible: {
            type: Boolean,
            default: true,
        },
        uploadedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

receiptSchema.index({ workspaceId: 1, transactionId: 1, uploadedAt: -1 });
receiptSchema.index({ workspaceId: 1, uploadedByMemberId: 1, uploadedAt: -1 });
receiptSchema.index({ workspaceId: 1, fileType: 1, uploadedAt: -1 });
receiptSchema.index({ workspaceId: 1, isVisible: 1, uploadedAt: -1 });
receiptSchema.index({ workspaceId: 1, filePublicId: 1 });

export type ReceiptModelType = Model<ReceiptDocument>;

export const ReceiptModel = model<ReceiptDocument, ReceiptModelType>(
    "Receipt",
    receiptSchema
);