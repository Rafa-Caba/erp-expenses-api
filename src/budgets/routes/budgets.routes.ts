import { Router } from "express";

import {
    createBudgetController,
    deleteBudgetController,
    getBudgetByIdController,
    getBudgetsController,
    updateBudgetController,
} from "../controllers/budgets.controller";
import {
    budgetParamsSchema,
    createBudgetSchema,
    updateBudgetSchema,
    workspaceBudgetParamsSchema,
} from "../schemas/budgets.schemas";
import type {
    BudgetParams,
    CreateBudgetBody,
    UpdateBudgetBody,
    WorkspaceBudgetParams,
} from "../types/budgets.types";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

const budgetRouter = Router({ mergeParams: true });

budgetRouter.use(requireWorkspaceAccess());

budgetRouter.get<WorkspaceBudgetParams>(
    "/",
    validateRequest(workspaceBudgetParamsSchema),
    requireWorkspacePermission("budgets.read"),
    getBudgetsController
);

budgetRouter.get<BudgetParams>(
    "/:budgetId",
    validateRequest(budgetParamsSchema),
    requireWorkspacePermission("budgets.read"),
    getBudgetByIdController
);

budgetRouter.post<WorkspaceBudgetParams, object, CreateBudgetBody>(
    "/",
    validateRequest(workspaceBudgetParamsSchema),
    validateRequest(createBudgetSchema),
    requireWorkspacePermission("budgets.create"),
    createBudgetController
);

budgetRouter.patch<BudgetParams, object, UpdateBudgetBody>(
    "/:budgetId",
    validateRequest(budgetParamsSchema),
    validateRequest(updateBudgetSchema),
    requireWorkspacePermission("budgets.update"),
    updateBudgetController
);

budgetRouter.delete<BudgetParams>(
    "/:budgetId",
    validateRequest(budgetParamsSchema),
    requireWorkspacePermission("budgets.delete"),
    deleteBudgetController
);

export { budgetRouter };