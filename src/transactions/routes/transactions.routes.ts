// src/transactions/routes/transactions.routes.ts

import { Router } from "express";
import { requireAuth } from "@/src/middlewares/requireAuth";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";

import {
    handleCreateTransaction,
    handleDeleteTransaction,
    handleGetTransaction,
    handleListTransactions,
    handleRestoreTransaction,
    handleUpdateTransaction,
} from "@/src/transactions/controllers/transactions.controller";

export const transactionsRouter = Router({ mergeParams: true });

transactionsRouter.use(requireAuth);
transactionsRouter.use(requireWorkspaceAccess("workspaceId"));

transactionsRouter.get("/", handleListTransactions);
transactionsRouter.post("/", handleCreateTransaction);

transactionsRouter.get("/:transactionId", handleGetTransaction);
transactionsRouter.patch("/:transactionId", handleUpdateTransaction);

transactionsRouter.delete("/:transactionId", handleDeleteTransaction);
transactionsRouter.patch("/:transactionId/restore", handleRestoreTransaction);