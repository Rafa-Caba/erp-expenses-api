// src/summary/routes/summary.routes.ts

import { Router } from "express";
import { requireAuth } from "@/src/middlewares/requireAuth";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { handleGetWorkspaceSummary } from "@/src/summary/controllers/summary.controller";

export const summaryRouter = Router({ mergeParams: true });

summaryRouter.use(requireAuth);
summaryRouter.use(requireWorkspaceAccess("workspaceId"));

summaryRouter.get("/", handleGetWorkspaceSummary);