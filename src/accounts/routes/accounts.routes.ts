// src/accounts/routes/account.routes.ts

import { Router } from "express";

import {
    archiveAccountController,
    createAccountController,
    getAccountByIdController,
    getAccountsController,
    updateAccountController,
} from "../controllers/accounts.controller";
import {
    accountParamsSchema,
    createAccountSchema,
    updateAccountSchema,
    workspaceAccountParamsSchema,
} from "../schemas/account.schemas";
import type {
    AccountParams,
    CreateAccountBody,
    UpdateAccountBody,
    WorkspaceAccountParams,
} from "../types/account.types";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

const accountRouter = Router({ mergeParams: true });

accountRouter.use(requireWorkspaceAccess());

accountRouter.get<WorkspaceAccountParams>(
    "/",
    validateRequest(workspaceAccountParamsSchema),
    requireWorkspacePermission("accounts.read"),
    getAccountsController
);

accountRouter.get<AccountParams>(
    "/:accountId",
    validateRequest(accountParamsSchema),
    requireWorkspacePermission("accounts.read"),
    getAccountByIdController
);

accountRouter.post<WorkspaceAccountParams, object, CreateAccountBody>(
    "/",
    validateRequest(workspaceAccountParamsSchema),
    validateRequest(createAccountSchema),
    requireWorkspacePermission("accounts.create"),
    createAccountController
);

accountRouter.patch<AccountParams, object, UpdateAccountBody>(
    "/:accountId",
    validateRequest(accountParamsSchema),
    validateRequest(updateAccountSchema),
    requireWorkspacePermission("accounts.update"),
    updateAccountController
);

accountRouter.delete<AccountParams>(
    "/:accountId",
    validateRequest(accountParamsSchema),
    requireWorkspacePermission("accounts.delete"),
    archiveAccountController
);

export { accountRouter };