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
import { reminderRouter } from "@/src/reminders/routes/reminders.routes";
import { reportRouter } from "@/src/reports/routes/reports.routes";
import { reconciliationRouter } from "@/src/reconciliations/routes/reconciliations.routes";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";

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
workspacesRouter.use("/:workspaceId/reconciliation", reconciliationRouter);
workspacesRouter.use("/:workspaceId/budgets", budgetRouter);
workspacesRouter.use("/:workspaceId/saving-goals", savingGoalRouter);
workspacesRouter.use("/:workspaceId/reminders", reminderRouter);
workspacesRouter.use("/:workspaceId/reports", reportRouter);

workspacesRouter.get("/", getWorkspacesController);

workspacesRouter.get<WorkspaceParams>(
    "/:workspaceId",
    validateRequest(workspaceParamsSchema),
    requireWorkspaceAccess(),
    requireWorkspacePermission("workspace.read"),
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
    requireWorkspaceAccess(),
    requireWorkspacePermission("workspace.update"),
    validateRequest(updateWorkspaceSchema),
    updateWorkspaceController
);

workspacesRouter.delete<WorkspaceParams>(
    "/:workspaceId",
    validateRequest(workspaceParamsSchema),
    requireWorkspaceAccess(),
    requireWorkspacePermission("workspace.archive"),
    archiveWorkspaceController
);

export { workspacesRouter };