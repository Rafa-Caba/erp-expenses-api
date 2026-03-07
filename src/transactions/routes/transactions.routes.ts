// src/transactions/routes/transactions.routes.ts

import { Router } from "express";

import {
    archiveTransactionController,
    createTransactionController,
    getTransactionByIdController,
    getTransactionsController,
    updateTransactionController,
} from "../controllers/transactions.controller";
import {
    createTransactionSchema,
    transactionParamsSchema,
    updateTransactionSchema,
    workspaceTransactionParamsSchema,
} from "../schemas/transaction.schemas";
import type {
    CreateTransactionBody,
    TransactionParams,
    UpdateTransactionBody,
    WorkspaceTransactionParams,
} from "../types/transaction.types";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

const transactionRouter = Router({ mergeParams: true });

transactionRouter.use(requireWorkspaceAccess());

transactionRouter.get<WorkspaceTransactionParams>(
    "/",
    validateRequest(workspaceTransactionParamsSchema),
    requireWorkspacePermission("transactions.read"),
    getTransactionsController
);

transactionRouter.get<TransactionParams>(
    "/:transactionId",
    validateRequest(transactionParamsSchema),
    requireWorkspacePermission("transactions.read"),
    getTransactionByIdController
);

transactionRouter.post<WorkspaceTransactionParams, object, CreateTransactionBody>(
    "/",
    validateRequest(workspaceTransactionParamsSchema),
    validateRequest(createTransactionSchema),
    requireWorkspacePermission("transactions.create"),
    createTransactionController
);

transactionRouter.patch<TransactionParams, object, UpdateTransactionBody>(
    "/:transactionId",
    validateRequest(transactionParamsSchema),
    validateRequest(updateTransactionSchema),
    requireWorkspacePermission("transactions.update"),
    updateTransactionController
);

transactionRouter.delete<TransactionParams>(
    "/:transactionId",
    validateRequest(transactionParamsSchema),
    requireWorkspacePermission("transactions.delete"),
    archiveTransactionController
);

export { transactionRouter };