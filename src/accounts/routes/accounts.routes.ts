// src/accounts/routes/accounts.routes.ts

import { Router } from "express";
import { requireAuth } from "@/src/middlewares/requireAuth";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import {
    handleCreateAccount,
    handleDisableAccount,
    handleEnableAccount,
    handleGetAccount,
    handleListAccounts,
    handlePatchAccount,
} from "@/src/accounts/controllers/accounts.controller";

export const accountsRouter = Router({ mergeParams: true });

accountsRouter.use(requireAuth);
accountsRouter.use(requireWorkspaceAccess("workspaceId"));

accountsRouter.get("/", handleListAccounts);
accountsRouter.post("/", handleCreateAccount);

accountsRouter.get("/:accountId", handleGetAccount);
accountsRouter.patch("/:accountId", handlePatchAccount);
accountsRouter.patch("/:accountId/disable", handleDisableAccount);
accountsRouter.patch("/:accountId/enable", handleEnableAccount);