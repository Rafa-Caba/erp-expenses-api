// src/scheduled/routes/scheduled.routes.ts

import { Router } from "express";
import { requireAuth } from "@/src/middlewares/requireAuth";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";

import {
    handleCreateScheduledItem,
    handleDeleteScheduledItem,
    handleGetScheduledItem,
    handleListScheduledItems,
    handleRestoreScheduledItem,
    handleUpdateScheduledItem,
} from "@/src/scheduled/controllers/scheduledItems.controller";

import { handleGeneratePending, handlePayOccurrence, handleUpcoming } from "@/src/scheduled/controllers/scheduledAutomation.controller";

export const scheduledRouter = Router({ mergeParams: true });

scheduledRouter.use(requireAuth);
scheduledRouter.use(requireWorkspaceAccess("workspaceId"));

// ScheduledItem CRUD
scheduledRouter.get("/items", handleListScheduledItems);
scheduledRouter.post("/items", handleCreateScheduledItem);

scheduledRouter.get("/items/:scheduledItemId", handleGetScheduledItem);
scheduledRouter.patch("/items/:scheduledItemId", handleUpdateScheduledItem);
scheduledRouter.delete("/items/:scheduledItemId", handleDeleteScheduledItem);
scheduledRouter.patch("/items/:scheduledItemId/restore", handleRestoreScheduledItem);

// Automation
scheduledRouter.post("/generate-pending", handleGeneratePending);
scheduledRouter.get("/upcoming", handleUpcoming);

// Occurrences
scheduledRouter.post("/occurrences/:occurrenceId/pay", handlePayOccurrence);