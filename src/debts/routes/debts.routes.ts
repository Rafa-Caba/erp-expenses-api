// src/debts/routes/debts.routes.ts
// Debt routes, including Phase 10 due payment processing.

import { Router } from "express";

import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";
import {
    createDebtController,
    deleteDebtController,
    getDebtByIdController,
    getDebtsController,
    processDueDebtPaymentsController,
    updateDebtController,
} from "../controllers/debts.controller";
import {
    createDebtSchema,
    debtParamsSchema,
    processDueDebtPaymentsSchema,
    updateDebtSchema,
    workspaceDebtParamsSchema,
} from "../schemas/debt.schemas";
import type {
    CreateDebtBody,
    DebtParams,
    ProcessDueDebtPaymentsBody,
    UpdateDebtBody,
    WorkspaceDebtParams,
} from "../types/debts.types";

const debtRouter = Router({ mergeParams: true });

debtRouter.use(requireWorkspaceAccess());

debtRouter.get<WorkspaceDebtParams>(
    "/",
    validateRequest(workspaceDebtParamsSchema),
    requireWorkspacePermission("debts.read"),
    getDebtsController
);

debtRouter.post<WorkspaceDebtParams, object, ProcessDueDebtPaymentsBody>(
    "/process-due-payments",
    validateRequest(workspaceDebtParamsSchema),
    validateRequest(processDueDebtPaymentsSchema),
    requireWorkspacePermission("debts.update"),
    requireWorkspacePermission("debts.pay"),
    requireWorkspacePermission("transactions.create"),
    processDueDebtPaymentsController
);

debtRouter.get<DebtParams>(
    "/:debtId",
    validateRequest(debtParamsSchema),
    requireWorkspacePermission("debts.read"),
    getDebtByIdController
);

debtRouter.post<WorkspaceDebtParams, object, CreateDebtBody>(
    "/",
    validateRequest(workspaceDebtParamsSchema),
    validateRequest(createDebtSchema),
    requireWorkspacePermission("debts.create"),
    createDebtController
);

debtRouter.patch<DebtParams, object, UpdateDebtBody>(
    "/:debtId",
    validateRequest(debtParamsSchema),
    validateRequest(updateDebtSchema),
    requireWorkspacePermission("debts.update"),
    updateDebtController
);

debtRouter.delete<DebtParams>(
    "/:debtId",
    validateRequest(debtParamsSchema),
    requireWorkspacePermission("debts.delete"),
    deleteDebtController
);

export { debtRouter };