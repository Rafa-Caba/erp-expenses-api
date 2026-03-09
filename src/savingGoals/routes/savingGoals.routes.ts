import { Router } from "express";

import {
    createSavingGoalController,
    deleteSavingGoalController,
    getSavingGoalByIdController,
    getSavingGoalsController,
    updateSavingGoalController,
} from "../controllers/savingGoals.controller";
import {
    createSavingGoalSchema,
    savingGoalParamsSchema,
    updateSavingGoalSchema,
    workspaceSavingGoalParamsSchema,
} from "../schemas/savingGoals.schemas";
import type {
    CreateSavingsGoalBody,
    SavingsGoalParams,
    UpdateSavingsGoalBody,
    WorkspaceSavingsGoalParams,
} from "../types/savingGoals.types";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

const savingGoalRouter = Router({ mergeParams: true });

savingGoalRouter.use(requireWorkspaceAccess());

savingGoalRouter.get<WorkspaceSavingsGoalParams>(
    "/",
    validateRequest(workspaceSavingGoalParamsSchema),
    requireWorkspacePermission("savingGoals.read"),
    getSavingGoalsController
);

savingGoalRouter.get<SavingsGoalParams>(
    "/:savingsGoalId",
    validateRequest(savingGoalParamsSchema),
    requireWorkspacePermission("savingGoals.read"),
    getSavingGoalByIdController
);

savingGoalRouter.post<WorkspaceSavingsGoalParams, object, CreateSavingsGoalBody>(
    "/",
    validateRequest(workspaceSavingGoalParamsSchema),
    validateRequest(createSavingGoalSchema),
    requireWorkspacePermission("savingGoals.create"),
    createSavingGoalController
);

savingGoalRouter.patch<SavingsGoalParams, object, UpdateSavingsGoalBody>(
    "/:savingsGoalId",
    validateRequest(savingGoalParamsSchema),
    validateRequest(updateSavingGoalSchema),
    requireWorkspacePermission("savingGoals.update"),
    updateSavingGoalController
);

savingGoalRouter.delete<SavingsGoalParams>(
    "/:savingsGoalId",
    validateRequest(savingGoalParamsSchema),
    requireWorkspacePermission("savingGoals.delete"),
    deleteSavingGoalController
);

export { savingGoalRouter };