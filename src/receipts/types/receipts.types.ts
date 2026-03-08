// src/receipts/types/receipts.types.ts

import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";

export const RECEIPT_FILE_TYPE_VALUES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
] as const;

export type ReceiptFileType = (typeof RECEIPT_FILE_TYPE_VALUES)[number];

export interface ReceiptDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    transactionId: Types.ObjectId;
    fileUrl: string;
    fileName: string;
    fileType: ReceiptFileType;
    fileSize?: number | null;
    filePublicId?: string | null;
    uploadedByMemberId: Types.ObjectId;
    notes?: string | null;
    isVisible?: boolean;
    uploadedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkspaceReceiptParams extends ParamsDictionary {
    workspaceId: string;
}

export interface ReceiptParams extends ParamsDictionary {
    workspaceId: string;
    receiptId: string;
}

export interface TransactionReceiptParams extends ParamsDictionary {
    workspaceId: string;
    transactionId: string;
}

export interface CreateReceiptBody {
    transactionId: string;
    uploadedByMemberId: string;
    notes?: string | null;
    isVisible?: boolean;
    uploadedAt?: string;
}

export interface UpdateReceiptBody {
    transactionId?: string;
    uploadedByMemberId?: string;
    notes?: string | null;
    isVisible?: boolean;
    uploadedAt?: string;
}

export interface UploadedCloudinaryFile extends Express.Multer.File {
    path: string;
    filename: string;
}

export interface CreateReceiptServiceInput {
    workspaceId: Types.ObjectId;
    body: CreateReceiptBody;
    file: UploadedCloudinaryFile;
    workspace: WorkspaceDocument;
}

export interface UpdateReceiptServiceInput {
    workspaceId: Types.ObjectId;
    receiptId: Types.ObjectId;
    body: UpdateReceiptBody;
    file?: UploadedCloudinaryFile;
    workspace: WorkspaceDocument;
}

export interface DeleteReceiptServiceInput {
    workspaceId: Types.ObjectId;
    receiptId: Types.ObjectId;
    workspace: WorkspaceDocument;
}