import { Router } from "express";

import {
    createPaymentController,
    deletePaymentController,
    getPaymentByIdController,
    getPaymentsController,
    updatePaymentController,
} from "../controllers/payments.controller";
import {
    createPaymentSchema,
    paymentParamsSchema,
    updatePaymentSchema,
    workspacePaymentParamsSchema,
} from "../schemas/payments.schemas";
import type {
    CreatePaymentBody,
    PaymentParams,
    UpdatePaymentBody,
    WorkspacePaymentParams,
} from "../types/payments.types";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

const paymentRouter = Router({ mergeParams: true });

paymentRouter.use(requireWorkspaceAccess());

paymentRouter.get<WorkspacePaymentParams>(
    "/",
    validateRequest(workspacePaymentParamsSchema),
    requireWorkspacePermission("payments.read"),
    getPaymentsController
);

paymentRouter.get<PaymentParams>(
    "/:paymentId",
    validateRequest(paymentParamsSchema),
    requireWorkspacePermission("payments.read"),
    getPaymentByIdController
);

paymentRouter.post<WorkspacePaymentParams, object, CreatePaymentBody>(
    "/",
    validateRequest(workspacePaymentParamsSchema),
    validateRequest(createPaymentSchema),
    requireWorkspacePermission("payments.create"),
    createPaymentController
);

paymentRouter.patch<PaymentParams, object, UpdatePaymentBody>(
    "/:paymentId",
    validateRequest(paymentParamsSchema),
    validateRequest(updatePaymentSchema),
    requireWorkspacePermission("payments.update"),
    updatePaymentController
);

paymentRouter.delete<PaymentParams>(
    "/:paymentId",
    validateRequest(paymentParamsSchema),
    requireWorkspacePermission("payments.delete"),
    deletePaymentController
);

export { paymentRouter };