// src/transactions/controllers/transactions.controller.ts

import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    archiveTransactionService,
    createTransactionService,
    getTransactionByIdService,
    getTransactionsService,
    isTransactionServiceError,
    TransactionServiceError,
    updateTransactionService,
} from "../services/transactions.service";
import type {
    CreateTransactionBody,
    TransactionParams,
    UpdateTransactionBody,
    WorkspaceTransactionParams,
} from "../types/transaction.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new TransactionServiceError(
            "El id proporcionado no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(value);
}

export const getTransactionsController: RequestHandler<
    WorkspaceTransactionParams
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
        const transactions = await getTransactionsService(workspaceId);

        res.status(200).json({
            message: "Transacciones obtenidas correctamente.",
            transactions,
        });
    } catch (error) {
        if (error instanceof Error && isTransactionServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const getTransactionByIdController: RequestHandler<
    TransactionParams
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

        const transaction = await getTransactionByIdService(workspaceId, transactionId);

        if (!transaction) {
            res.status(404).json({
                code: "TRANSACTION_NOT_FOUND",
                message: "Transacción no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Transacción obtenida correctamente.",
            transaction,
        });
    } catch (error) {
        if (error instanceof Error && isTransactionServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const createTransactionController: RequestHandler<
    WorkspaceTransactionParams,
    object,
    CreateTransactionBody
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

        const transaction = await createTransactionService({
            workspaceId,
            body: req.body,
            workspace: req.workspace,
        });

        res.status(201).json({
            message: "Transacción creada correctamente.",
            transaction,
        });
    } catch (error) {
        if (error instanceof Error && isTransactionServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updateTransactionController: RequestHandler<
    TransactionParams,
    object,
    UpdateTransactionBody
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

        const transaction = await updateTransactionService({
            workspaceId,
            transactionId,
            body: req.body,
            workspace: req.workspace,
        });

        if (!transaction) {
            res.status(404).json({
                code: "TRANSACTION_NOT_FOUND",
                message: "Transacción no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Transacción actualizada correctamente.",
            transaction,
        });
    } catch (error) {
        if (error instanceof Error && isTransactionServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const archiveTransactionController: RequestHandler<
    TransactionParams
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

        const transaction = await archiveTransactionService({
            workspaceId,
            transactionId,
            workspace: req.workspace,
        });

        if (!transaction) {
            res.status(404).json({
                code: "TRANSACTION_NOT_FOUND",
                message: "Transacción no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Transacción archivada correctamente.",
            transaction,
        });
    } catch (error) {
        if (error instanceof Error && isTransactionServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};