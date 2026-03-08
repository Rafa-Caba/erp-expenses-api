// src/receipts/services/receipts.service.ts

import { Types } from "mongoose";

import { ReceiptModel } from "../models/Receipt.model";
import type {
    CreateReceiptServiceInput,
    DeleteReceiptServiceInput,
    ReceiptFileType,
    UpdateReceiptServiceInput,
    UploadedCloudinaryFile,
    ReceiptDocument
} from "../types/receipts.types";
import { deleteFromCloudinary } from "@/src/middlewares/cloudinaryUploads";
import { TransactionModel } from "@/src/transactions/models/Transaction.model";

function normalizeNullableString(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}

function parseRequiredObjectId(value: string): Types.ObjectId {
    return new Types.ObjectId(value);
}

function parseUploadedAt(value: string | undefined): Date {
    if (!value) {
        return new Date();
    }

    return new Date(value);
}

function isValidDate(value: Date): boolean {
    return !Number.isNaN(value.getTime());
}

function mapMimeTypeToReceiptFileType(mimeType: string): ReceiptFileType {
    if (
        mimeType === "image/jpeg" ||
        mimeType === "image/png" ||
        mimeType === "image/webp" ||
        mimeType === "application/pdf"
    ) {
        return mimeType;
    }

    throw new ReceiptServiceError(
        "El tipo de archivo no es válido para recibos.",
        400,
        "INVALID_RECEIPT_FILE_TYPE"
    );
}

async function ensureTransactionExistsInWorkspace(
    workspaceId: Types.ObjectId,
    transactionId: Types.ObjectId
): Promise<void> {
    const transaction = await TransactionModel.findOne({
        _id: transactionId,
        workspaceId,
    }).lean();

    if (!transaction) {
        throw new ReceiptServiceError(
            "La transacción no existe en este workspace.",
            404,
            "TRANSACTION_NOT_FOUND"
        );
    }
}

async function findReceiptById(
    workspaceId: Types.ObjectId,
    receiptId: Types.ObjectId
): Promise<ReceiptDocument | null> {
    return ReceiptModel.findOne({
        _id: receiptId,
        workspaceId,
    }).lean<ReceiptDocument | null>();
}

function extractFileData(file: UploadedCloudinaryFile): {
    fileUrl: string;
    filePublicId: string;
    fileName: string;
    fileType: ReceiptFileType;
    fileSize: number | null;
} {
    return {
        fileUrl: file.path,
        filePublicId: file.filename,
        fileName: file.originalname,
        fileType: mapMimeTypeToReceiptFileType(file.mimetype),
        fileSize: typeof file.size === "number" ? file.size : null,
    };
}

function getCloudinaryResourceType(fileType: ReceiptFileType): "image" | "raw" {
    if (fileType === "application/pdf") {
        return "raw";
    }

    return "image";
}

export class ReceiptServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.name = "ReceiptServiceError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

export function isReceiptServiceError(error: Error): error is ReceiptServiceError {
    return error instanceof ReceiptServiceError;
}

export async function getReceiptsService(
    workspaceId: Types.ObjectId
): Promise<ReceiptDocument[]> {
    return ReceiptModel.find({
        workspaceId,
    })
        .sort({
            uploadedAt: -1,
            createdAt: -1,
        })
        .lean<ReceiptDocument[]>();
}

export async function getReceiptsByTransactionService(
    workspaceId: Types.ObjectId,
    transactionId: Types.ObjectId
): Promise<ReceiptDocument[]> {
    return ReceiptModel.find({
        workspaceId,
        transactionId,
    })
        .sort({
            uploadedAt: -1,
            createdAt: -1,
        })
        .lean<ReceiptDocument[]>();
}

export async function getReceiptByIdService(
    workspaceId: Types.ObjectId,
    receiptId: Types.ObjectId
): Promise<ReceiptDocument | null> {
    return findReceiptById(workspaceId, receiptId);
}

export async function createReceiptService(
    input: CreateReceiptServiceInput
): Promise<ReceiptDocument> {
    const { workspaceId, body, file } = input;

    const transactionId = parseRequiredObjectId(body.transactionId);
    const uploadedByMemberId = parseRequiredObjectId(body.uploadedByMemberId);
    const uploadedAt = parseUploadedAt(body.uploadedAt);

    if (!isValidDate(uploadedAt)) {
        throw new ReceiptServiceError(
            "La fecha de carga no es válida.",
            400,
            "INVALID_UPLOADED_AT"
        );
    }

    await ensureTransactionExistsInWorkspace(workspaceId, transactionId);

    const fileData = extractFileData(file);

    const receipt = await ReceiptModel.create({
        workspaceId,
        transactionId,
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName,
        fileType: fileData.fileType,
        fileSize: fileData.fileSize,
        filePublicId: fileData.filePublicId,
        uploadedByMemberId,
        notes: normalizeNullableString(body.notes),
        isVisible: body.isVisible ?? true,
        uploadedAt,
    });

    return {
        _id: receipt._id,
        workspaceId: receipt.workspaceId,
        transactionId: receipt.transactionId,
        fileUrl: receipt.fileUrl,
        fileName: receipt.fileName,
        fileType: receipt.fileType,
        fileSize: receipt.fileSize ?? null,
        filePublicId: receipt.filePublicId ?? null,
        uploadedByMemberId: receipt.uploadedByMemberId,
        notes: receipt.notes ?? null,
        isVisible: receipt.isVisible ?? true,
        uploadedAt: receipt.uploadedAt,
        createdAt: receipt.createdAt,
        updatedAt: receipt.updatedAt,
    };
}

export async function updateReceiptService(
    input: UpdateReceiptServiceInput
): Promise<ReceiptDocument | null> {
    const { workspaceId, receiptId, body, file } = input;

    const existingReceipt = await findReceiptById(workspaceId, receiptId);

    if (!existingReceipt) {
        return null;
    }

    const nextTransactionId =
        body.transactionId !== undefined
            ? parseRequiredObjectId(body.transactionId)
            : existingReceipt.transactionId;

    const nextUploadedByMemberId =
        body.uploadedByMemberId !== undefined
            ? parseRequiredObjectId(body.uploadedByMemberId)
            : existingReceipt.uploadedByMemberId;

    const nextUploadedAt =
        body.uploadedAt !== undefined
            ? parseUploadedAt(body.uploadedAt)
            : existingReceipt.uploadedAt;

    if (!isValidDate(nextUploadedAt)) {
        throw new ReceiptServiceError(
            "La fecha de carga no es válida.",
            400,
            "INVALID_UPLOADED_AT"
        );
    }

    await ensureTransactionExistsInWorkspace(workspaceId, nextTransactionId);

    const nextFileData = file ? extractFileData(file) : null;

    if (
        nextFileData !== null &&
        existingReceipt.filePublicId &&
        existingReceipt.filePublicId !== nextFileData.filePublicId
    ) {
        await deleteFromCloudinary(
            existingReceipt.filePublicId,
            getCloudinaryResourceType(existingReceipt.fileType)
        );
    }

    const updatedReceipt = await ReceiptModel.findOneAndUpdate(
        {
            _id: receiptId,
            workspaceId,
        },
        {
            $set: {
                transactionId: nextTransactionId,
                uploadedByMemberId: nextUploadedByMemberId,
                fileUrl: nextFileData ? nextFileData.fileUrl : existingReceipt.fileUrl,
                fileName: nextFileData ? nextFileData.fileName : existingReceipt.fileName,
                fileType: nextFileData ? nextFileData.fileType : existingReceipt.fileType,
                fileSize:
                    nextFileData !== null
                        ? nextFileData.fileSize
                        : existingReceipt.fileSize ?? null,
                filePublicId:
                    nextFileData !== null
                        ? nextFileData.filePublicId
                        : existingReceipt.filePublicId ?? null,
                notes:
                    body.notes !== undefined
                        ? normalizeNullableString(body.notes)
                        : existingReceipt.notes ?? null,
                isVisible:
                    body.isVisible !== undefined
                        ? body.isVisible
                        : existingReceipt.isVisible ?? true,
                uploadedAt: nextUploadedAt,
            },
        },
        {
            new: true,
        }
    ).lean<ReceiptDocument | null>();

    return updatedReceipt;
}

export async function deleteReceiptService(
    input: DeleteReceiptServiceInput
): Promise<ReceiptDocument | null> {
    const { workspaceId, receiptId } = input;

    const existingReceipt = await findReceiptById(workspaceId, receiptId);

    if (!existingReceipt) {
        return null;
    }

    const deletedReceipt = await ReceiptModel.findOneAndDelete({
        _id: receiptId,
        workspaceId,
    }).lean<ReceiptDocument | null>();

    if (deletedReceipt?.filePublicId) {
        await deleteFromCloudinary(
            deletedReceipt.filePublicId,
            getCloudinaryResourceType(deletedReceipt.fileType)
        );
    }

    return deletedReceipt;
}