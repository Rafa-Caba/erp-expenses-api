// src/workspaces/routes/workspaces.routes.ts

import { Router } from "express";

import {
    archiveWorkspaceController,
    createWorkspaceController,
    getWorkspaceByIdController,
    getWorkspacesController,
    updateWorkspaceController,
} from "../controllers/workspaces.controller";
import {
    createWorkspaceSchema,
    updateWorkspaceSchema,
    workspaceParamsSchema,
} from "../schemas/workspace.schemas";
import type {
    UpdateWorkspaceBody,
    WorkspaceParams,
} from "../types/workspace.types";
import { workspaceMemberRouter } from "./workspaceMember.routes";
import { accountRouter } from "@/src/accounts/routes/accounts.routes";
import { cardRouter } from "@/src/cards/routes/card.routes";
import { categoryRouter } from "@/src/categories/routes/categories.routes";
import { receiptRouter } from "@/src/receipts/routes/receipts.routes";
import { transactionRouter } from "@/src/transactions/routes/transactions.routes";
import { workspaceSettingsRouter } from "@/src/workspaceSettings/routes/workspaceSettings.routes";
import { validateRequest } from "@/src/middlewares/validateRequest";
import { verifyToken } from "@/src/middlewares/verifyToken";
import { debtRouter } from "@/src/debts/routes/debts.routes";
import { paymentRouter } from "@/src/payments/routes/payments.routes";
import { budgetRouter } from "@/src/budgets/routes/budgets.routes";
import { savingGoalRouter } from "@/src/savingGoals/routes/savingGoals.routes";

const workspacesRouter = Router();

workspacesRouter.use(verifyToken);

workspacesRouter.use("/:workspaceId/members", workspaceMemberRouter);
workspacesRouter.use("/:workspaceId/settings", workspaceSettingsRouter);
workspacesRouter.use("/:workspaceId/accounts", accountRouter);
workspacesRouter.use("/:workspaceId/cards", cardRouter);
workspacesRouter.use("/:workspaceId/categories", categoryRouter);
workspacesRouter.use("/:workspaceId/transactions", transactionRouter);
workspacesRouter.use("/:workspaceId/receipts", receiptRouter);
workspacesRouter.use("/:workspaceId/debts", debtRouter);
workspacesRouter.use("/:workspaceId/payments", paymentRouter);
workspacesRouter.use("/:workspaceId/budgets", budgetRouter);
workspacesRouter.use("/:workspaceId/saving-goals", savingGoalRouter);

workspacesRouter.get("/", getWorkspacesController);

workspacesRouter.get<WorkspaceParams>(
    "/:workspaceId",
    validateRequest(workspaceParamsSchema),
    getWorkspaceByIdController
);

workspacesRouter.post(
    "/",
    validateRequest(createWorkspaceSchema),
    createWorkspaceController
);

workspacesRouter.patch<WorkspaceParams, object, UpdateWorkspaceBody>(
    "/:workspaceId",
    validateRequest(workspaceParamsSchema),
    validateRequest(updateWorkspaceSchema),
    updateWorkspaceController
);

workspacesRouter.delete<WorkspaceParams>(
    "/:workspaceId",
    validateRequest(workspaceParamsSchema),
    archiveWorkspaceController
);

export { workspacesRouter };