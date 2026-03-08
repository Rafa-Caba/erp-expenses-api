import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    createPaymentService,
    deletePaymentService,
    getPaymentByIdService,
    getPaymentsService,
    isPaymentServiceError,
    updatePaymentService,
} from "../services/payments.service";
import type {
    CreatePaymentBody,
    PaymentParams,
    UpdatePaymentBody,
    WorkspacePaymentParams,
} from "../types/payments.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new Error("INVALID_OBJECT_ID");
    }

    return new Types.ObjectId(value);
}

export const getPaymentsController: RequestHandler<
    WorkspacePaymentParams
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
        const payments = await getPaymentsService(workspaceId);

        res.status(200).json({
            message: "Pagos obtenidos correctamente.",
            payments,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_OBJECT_ID") {
            res.status(400).json({
                code: "INVALID_OBJECT_ID",
                message: "El id proporcionado no es válido.",
            });
            return;
        }

        if (error instanceof Error && isPaymentServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const getPaymentByIdController: RequestHandler<
    PaymentParams
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
        const paymentId = getObjectIdOrThrow(req.params.paymentId);

        const payment = await getPaymentByIdService(workspaceId, paymentId);

        if (!payment) {
            res.status(404).json({
                code: "PAYMENT_NOT_FOUND",
                message: "Pago no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Pago obtenido correctamente.",
            payment,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_OBJECT_ID") {
            res.status(400).json({
                code: "INVALID_OBJECT_ID",
                message: "El id proporcionado no es válido.",
            });
            return;
        }

        if (error instanceof Error && isPaymentServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const createPaymentController: RequestHandler<
    WorkspacePaymentParams,
    object,
    CreatePaymentBody
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

        const payment = await createPaymentService({
            workspaceId,
            body: req.body,
            workspace: req.workspace,
        });

        res.status(201).json({
            message: "Pago creado correctamente.",
            payment,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_OBJECT_ID") {
            res.status(400).json({
                code: "INVALID_OBJECT_ID",
                message: "El id proporcionado no es válido.",
            });
            return;
        }

        if (error instanceof Error && isPaymentServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updatePaymentController: RequestHandler<
    PaymentParams,
    object,
    UpdatePaymentBody
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
        const paymentId = getObjectIdOrThrow(req.params.paymentId);

        const payment = await updatePaymentService({
            workspaceId,
            paymentId,
            body: req.body,
            workspace: req.workspace,
        });

        if (!payment) {
            res.status(404).json({
                code: "PAYMENT_NOT_FOUND",
                message: "Pago no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Pago actualizado correctamente.",
            payment,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_OBJECT_ID") {
            res.status(400).json({
                code: "INVALID_OBJECT_ID",
                message: "El id proporcionado no es válido.",
            });
            return;
        }

        if (error instanceof Error && isPaymentServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const deletePaymentController: RequestHandler<
    PaymentParams
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
        const paymentId = getObjectIdOrThrow(req.params.paymentId);

        const payment = await deletePaymentService({
            workspaceId,
            paymentId,
            workspace: req.workspace,
        });

        if (!payment) {
            res.status(404).json({
                code: "PAYMENT_NOT_FOUND",
                message: "Pago no encontrado.",
            });
            return;
        }

        res.status(200).json({
            message: "Pago eliminado correctamente.",
            payment,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_OBJECT_ID") {
            res.status(400).json({
                code: "INVALID_OBJECT_ID",
                message: "El id proporcionado no es válido.",
            });
            return;
        }

        if (error instanceof Error && isPaymentServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};