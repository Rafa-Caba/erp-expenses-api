// src/subscriptions/controllers/subscriptions.controller.ts
// Express controllers for subscription CRUD and reviewed transaction creation.

import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    createSubscriptionService,
    createTransactionFromSubscriptionService,
    deleteSubscriptionService,
    getSubscriptionByIdService,
    getSubscriptionsService,
    isSubscriptionServiceError,
    updateSubscriptionService,
} from "../services/subscriptions.service";
import type {
    CreateSubscriptionBody,
    CreateSubscriptionTransactionBody,
    SubscriptionParams,
    UpdateSubscriptionBody,
    WorkspaceSubscriptionParams,
} from "../types/subscription.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        const error = new Error("El id proporcionado no es válido.");
        error.name = "INVALID_OBJECT_ID";
        throw error;
    }

    return new Types.ObjectId(value);
}

function handleObjectIdError(error: Error, res: Parameters<RequestHandler>[1]): boolean {
    if (error.name !== "INVALID_OBJECT_ID") {
        return false;
    }

    res.status(400).json({
        code: "INVALID_OBJECT_ID",
        message: error.message,
    });
    return true;
}

export const getSubscriptionsController: RequestHandler<
    WorkspaceSubscriptionParams
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
        const subscriptions = await getSubscriptionsService(workspaceId);

        res.status(200).json({
            message: "Suscripciones obtenidas correctamente.",
            subscriptions,
        });
    } catch (error) {
        if (error instanceof Error && handleObjectIdError(error, res)) {
            return;
        }

        if (error instanceof Error && isSubscriptionServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const getSubscriptionByIdController: RequestHandler<
    SubscriptionParams
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
        const subscriptionId = getObjectIdOrThrow(req.params.subscriptionId);
        const subscription = await getSubscriptionByIdService(workspaceId, subscriptionId);

        if (!subscription) {
            res.status(404).json({
                code: "SUBSCRIPTION_NOT_FOUND",
                message: "Suscripción no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Suscripción obtenida correctamente.",
            subscription,
        });
    } catch (error) {
        if (error instanceof Error && handleObjectIdError(error, res)) {
            return;
        }

        if (error instanceof Error && isSubscriptionServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const createSubscriptionController: RequestHandler<
    WorkspaceSubscriptionParams,
    object,
    CreateSubscriptionBody
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
        const subscription = await createSubscriptionService({
            workspaceId,
            body: req.body,
            workspace: req.workspace,
        });

        res.status(201).json({
            message: "Suscripción creada correctamente.",
            subscription,
        });
    } catch (error) {
        if (error instanceof Error && handleObjectIdError(error, res)) {
            return;
        }

        if (error instanceof Error && isSubscriptionServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updateSubscriptionController: RequestHandler<
    SubscriptionParams,
    object,
    UpdateSubscriptionBody
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
        const subscriptionId = getObjectIdOrThrow(req.params.subscriptionId);
        const subscription = await updateSubscriptionService({
            workspaceId,
            subscriptionId,
            body: req.body,
            workspace: req.workspace,
        });

        if (!subscription) {
            res.status(404).json({
                code: "SUBSCRIPTION_NOT_FOUND",
                message: "Suscripción no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Suscripción actualizada correctamente.",
            subscription,
        });
    } catch (error) {
        if (error instanceof Error && handleObjectIdError(error, res)) {
            return;
        }

        if (error instanceof Error && isSubscriptionServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const deleteSubscriptionController: RequestHandler<
    SubscriptionParams
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
        const subscriptionId = getObjectIdOrThrow(req.params.subscriptionId);
        const subscription = await deleteSubscriptionService({
            workspaceId,
            subscriptionId,
            workspace: req.workspace,
        });

        if (!subscription) {
            res.status(404).json({
                code: "SUBSCRIPTION_NOT_FOUND",
                message: "Suscripción no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Suscripción eliminada correctamente.",
            subscription,
        });
    } catch (error) {
        if (error instanceof Error && handleObjectIdError(error, res)) {
            return;
        }

        if (error instanceof Error && isSubscriptionServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const createSubscriptionTransactionController: RequestHandler<
    SubscriptionParams,
    object,
    CreateSubscriptionTransactionBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace || !req.workspaceMember) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const subscriptionId = getObjectIdOrThrow(req.params.subscriptionId);
        const result = await createTransactionFromSubscriptionService({
            workspaceId,
            subscriptionId,
            body: req.body,
            workspace: req.workspace,
            createdByUserId: req.workspaceMember._id,
        });

        res.status(201).json({
            message: "Transacción creada desde suscripción correctamente.",
            subscription: result.subscription,
            transaction: result.transaction,
        });
    } catch (error) {
        if (error instanceof Error && handleObjectIdError(error, res)) {
            return;
        }

        if (error instanceof Error && isSubscriptionServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};
