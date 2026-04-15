// src/reconciliations/routes/reconciliations.routes.ts

import { Router } from "express";

import {
    createReconciliationController,
    deleteReconciliationController,
    getReconciliationByIdController,
    getReconciliationsController,
    getReconciliationSummaryController,
    updateReconciliationController,
} from "../controllers/reconciliations.controller";
import {
    createReconciliationSchema,
    reconciliationParamsSchema,
    updateReconciliationSchema,
    workspaceReconciliationParamsSchema,
} from "../schemas/reconciliations.schemas";
import type {
    CreateReconciliationBody,
    ReconciliationParams,
    UpdateReconciliationBody,
    WorkspaceReconciliationParams,
} from "../types/reconciliations.types";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

const reconciliationRouter = Router({ mergeParams: true });

reconciliationRouter.use(requireWorkspaceAccess());

reconciliationRouter.get(
    "/summary",
    validateRequest(workspaceReconciliationParamsSchema),
    requireWorkspacePermission("reconciliation.read"),
    getReconciliationSummaryController
);

reconciliationRouter.get(
    "/",
    validateRequest(workspaceReconciliationParamsSchema),
    requireWorkspacePermission("reconciliation.read"),
    getReconciliationsController
);

reconciliationRouter.get<ReconciliationParams>(
    "/:reconciliationId",
    validateRequest(reconciliationParamsSchema),
    requireWorkspacePermission("reconciliation.read"),
    getReconciliationByIdController
);

reconciliationRouter.post<
    WorkspaceReconciliationParams,
    object,
    CreateReconciliationBody
>(
    "/",
    validateRequest(workspaceReconciliationParamsSchema),
    validateRequest(createReconciliationSchema),
    requireWorkspacePermission("reconciliation.create"),
    createReconciliationController
);

reconciliationRouter.patch<
    ReconciliationParams,
    object,
    UpdateReconciliationBody
>(
    "/:reconciliationId",
    validateRequest(reconciliationParamsSchema),
    validateRequest(updateReconciliationSchema),
    requireWorkspacePermission("reconciliation.update"),
    updateReconciliationController
);

reconciliationRouter.delete<ReconciliationParams>(
    "/:reconciliationId",
    validateRequest(reconciliationParamsSchema),
    requireWorkspacePermission("reconciliation.delete"),
    deleteReconciliationController
);

export { reconciliationRouter };