// src/debts/routes/debts.routes.ts

import { Router } from "express";
import { requireAuth } from "@/src/middlewares/requireAuth";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";

import {
    handleCreateDebt,
    handleDeleteDebt,
    handleGetDebt,
    handleListDebts,
    handleRestoreDebt,
    handleUpdateDebt,
} from "@/src/debts/controllers/debts.controller";

import { handleCreateDebtPayment } from "@/src/debts/controllers/debtPayments.controller";

export const debtsRouter = Router({ mergeParams: true });

debtsRouter.use(requireAuth);
debtsRouter.use(requireWorkspaceAccess("workspaceId"));

// Debts CRUD
debtsRouter.get("/", handleListDebts);
debtsRouter.post("/", handleCreateDebt);

debtsRouter.get("/:debtId", handleGetDebt);
debtsRouter.patch("/:debtId", handleUpdateDebt);

debtsRouter.delete("/:debtId", handleDeleteDebt);
debtsRouter.patch("/:debtId/restore", handleRestoreDebt);

// Payments
debtsRouter.post("/:debtId/payments", handleCreateDebtPayment);