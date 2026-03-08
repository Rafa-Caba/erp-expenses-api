// src/debts/routes/debts.routes.ts

import { Router } from "express";

import {
    createDebtController,
    deleteDebtController,
    getDebtByIdController,
    getDebtsController,
    updateDebtController,
} from "../controllers/debts.controller";
import {
    createDebtSchema,
    debtParamsSchema,
    updateDebtSchema,
    workspaceDebtParamsSchema,
} from "../schemas/debt.schemas";
import type {
    CreateDebtBody,
    DebtParams,
    UpdateDebtBody,
    WorkspaceDebtParams,
} from "../types/debts.types";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

const debtRouter = Router({ mergeParams: true });

debtRouter.use(requireWorkspaceAccess());

debtRouter.get<WorkspaceDebtParams>(
    "/",
    validateRequest(workspaceDebtParamsSchema),
    requireWorkspacePermission("debts.read"),
    getDebtsController
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