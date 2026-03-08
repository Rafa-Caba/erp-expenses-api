// src/receipts/controllers/receipts.controller.ts

import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    createReceiptService,
    deleteReceiptService,
    getReceiptByIdService,
    getReceiptsByTransactionService,
    getReceiptsService,
    isReceiptServiceError,
    ReceiptServiceError,
    updateReceiptService,
} from "../services/receipts.service";
import type {
    CreateReceiptBody,
    ReceiptParams,
    TransactionReceiptParams,
    UpdateReceiptBody,
    UploadedCloudinaryFile,
    WorkspaceReceiptParams,
} from "../types/receipts.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new ReceiptServiceError(
            "El id proporcionado no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(value);
}

function getUploadedFileOrThrow(file: Express.Multer.File | undefined): UploadedCloudinaryFile {
    if (!file) {
        throw new ReceiptServiceError(
            "El archivo del recibo es obligatorio.",
            400,
            "RECEIPT_FILE_REQUIRED"
        );
    }

    const candidateFile = file as UploadedCloudinaryFile;

    if (!candidateFile.path || !candidateFile.filename) {
        throw new ReceiptServiceError(
            "El archivo subido no contiene la metadata esperada.",
            400,
            "INVALID_RECEIPT_FILE_METADATA"
        );
    }

    return candidateFile;
}

export const getReceiptsController: RequestHandler<
    WorkspaceReceiptParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const receipts = await getReceiptsService(workspaceId);

        res.status(200).json({
            message: "Recibos obtenidos correctamente.",
            receipts,
        });
    } catch (error) {
        if (error instanceof Error && isReceiptServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const getReceiptsByTransactionController: RequestHandler<
    TransactionReceiptParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const transactionId = getObjectIdOrThrow(req.params.transactionId);
        const receipts = await getReceiptsByTransactionService(workspaceId, transactionId);

        res.status(200).json({
            message: "Recibos obtenidos correctamente.",
            receipts,
        });
    } catch (error) {
        if (error instanceof Error && isReceiptServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const getReceiptByIdController: RequestHandler<
    ReceiptParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const receiptId = getObjectIdOrThrow(req.params.receiptId);

        const receipt = await getReceiptByIdService(workspaceId, receiptId);

        if (!receipt) {
            res.status(404).json({
                code: "RECEIPT_NOT_FOUND",
                message: "Recibo no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Recibo obtenido correctamente.",
            receipt,
        });
    } catch (error) {
        if (error instanceof Error && isReceiptServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const createReceiptController: RequestHandler<
    WorkspaceReceiptParams,
    object,
    CreateReceiptBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const uploadedFile = getUploadedFileOrThrow(req.file);
        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);

        const receipt = await createReceiptService({
            workspaceId,
            body: req.body,
            file: uploadedFile,
            workspace: req.workspace,
        });

        res.status(201).json({
            message: "Recibo creado correctamente.",
            receipt,
        });
    } catch (error) {
        if (error instanceof Error && isReceiptServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updateReceiptController: RequestHandler<
    ReceiptParams,
    object,
    UpdateReceiptBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const receiptId = getObjectIdOrThrow(req.params.receiptId);

        const uploadedFile =
            req.file !== undefined ? getUploadedFileOrThrow(req.file) : undefined;

        const receipt = await updateReceiptService({
            workspaceId,
            receiptId,
            body: req.body,
            file: uploadedFile,
            workspace: req.workspace,
        });

        if (!receipt) {
            res.status(404).json({
                code: "RECEIPT_NOT_FOUND",
                message: "Recibo no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Recibo actualizado correctamente.",
            receipt,
        });
    } catch (error) {
        if (error instanceof Error && isReceiptServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const deleteReceiptController: RequestHandler<
    ReceiptParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const receiptId = getObjectIdOrThrow(req.params.receiptId);

        const receipt = await deleteReceiptService({
            workspaceId,
            receiptId,
            workspace: req.workspace,
        });

        if (!receipt) {
            res.status(404).json({
                code: "RECEIPT_NOT_FOUND",
                message: "Recibo no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Recibo eliminado correctamente.",
            receipt,
        });
    } catch (error) {
        if (error instanceof Error && isReceiptServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};