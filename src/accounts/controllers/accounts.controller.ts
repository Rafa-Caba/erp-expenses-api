// src/accounts/controllers/account.controller.ts

import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    archiveAccountService,
    createAccountService,
    getAccountByIdService,
    getAccountsService,
    isAccountServiceError,
    updateAccountService,
    AccountServiceError,
} from "../services/accounts.service";
import type {
    AccountParams,
    CreateAccountBody,
    UpdateAccountBody,
    WorkspaceAccountParams,
} from "../types/account.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new AccountServiceError(
            "El id proporcionado no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(value);
}

export const getAccountsController: RequestHandler<
    WorkspaceAccountParams
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
        const accounts = await getAccountsService(workspaceId);

        res.status(200).json({
            message: "Cuentas obtenidas correctamente.",
            accounts,
        });
    } catch (error) {
        if (error instanceof Error && isAccountServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const getAccountByIdController: RequestHandler<
    AccountParams
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
        const accountId = getObjectIdOrThrow(req.params.accountId);

        const account = await getAccountByIdService(workspaceId, accountId);

        if (!account) {
            res.status(404).json({
                code: "ACCOUNT_NOT_FOUND",
                message: "Cuenta no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Cuenta obtenida correctamente.",
            account,
        });
    } catch (error) {
        if (error instanceof Error && isAccountServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const createAccountController: RequestHandler<
    WorkspaceAccountParams,
    object,
    CreateAccountBody
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

        const account = await createAccountService({
            workspaceId,
            body: req.body,
        });

        res.status(201).json({
            message: "Cuenta creada correctamente.",
            account,
        });
    } catch (error) {
        if (error instanceof Error && isAccountServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updateAccountController: RequestHandler<
    AccountParams,
    object,
    UpdateAccountBody
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
        const accountId = getObjectIdOrThrow(req.params.accountId);

        const account = await updateAccountService({
            workspaceId,
            accountId,
            body: req.body,
        });

        if (!account) {
            res.status(404).json({
                code: "ACCOUNT_NOT_FOUND",
                message: "Cuenta no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Cuenta actualizada correctamente.",
            account,
        });
    } catch (error) {
        if (error instanceof Error && isAccountServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const archiveAccountController: RequestHandler<
    AccountParams
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
        const accountId = getObjectIdOrThrow(req.params.accountId);

        const account = await archiveAccountService(workspaceId, accountId);

        if (!account) {
            res.status(404).json({
                code: "ACCOUNT_NOT_FOUND",
                message: "Cuenta no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Cuenta archivada correctamente.",
            account,
        });
    } catch (error) {
        if (error instanceof Error && isAccountServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};