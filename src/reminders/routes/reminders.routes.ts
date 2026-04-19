// src/reminders/routes/reminders.routes.ts

import { Router } from "express";

import {
    createReminderController,
    deleteReminderController,
    getReminderByIdController,
    getRemindersController,
    markReminderAsViewedController,
    respondToReminderController,
    updateReminderController,
} from "../controllers/reminders.controller";
import {
    createReminderSchema,
    reminderParamsSchema,
    respondToReminderSchema,
    updateReminderSchema,
    workspaceReminderParamsSchema,
} from "../schemas/reminders.schemas";
import type {
    CreateReminderBody,
    ReminderParams,
    RespondToReminderBody,
    UpdateReminderBody,
    WorkspaceReminderParams,
} from "../types/reminders.types";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

const reminderRouter = Router({ mergeParams: true });

reminderRouter.use(requireWorkspaceAccess());

reminderRouter.get<WorkspaceReminderParams>(
    "/",
    validateRequest(workspaceReminderParamsSchema),
    requireWorkspacePermission("reminders.read"),
    getRemindersController
);

reminderRouter.get<ReminderParams>(
    "/:reminderId",
    validateRequest(reminderParamsSchema),
    requireWorkspacePermission("reminders.read"),
    getReminderByIdController
);

reminderRouter.post<WorkspaceReminderParams, object, CreateReminderBody>(
    "/",
    validateRequest(workspaceReminderParamsSchema),
    validateRequest(createReminderSchema),
    requireWorkspacePermission("reminders.create"),
    createReminderController
);

reminderRouter.patch<ReminderParams, object, UpdateReminderBody>(
    "/:reminderId",
    validateRequest(reminderParamsSchema),
    validateRequest(updateReminderSchema),
    requireWorkspacePermission("reminders.update"),
    updateReminderController
);

reminderRouter.patch<ReminderParams>(
    "/:reminderId/view",
    validateRequest(reminderParamsSchema),
    requireWorkspacePermission("reminders.read"),
    markReminderAsViewedController
);

reminderRouter.patch<ReminderParams, object, RespondToReminderBody>(
    "/:reminderId/respond",
    validateRequest(reminderParamsSchema),
    validateRequest(respondToReminderSchema),
    requireWorkspacePermission("reminders.read"),
    respondToReminderController
);

reminderRouter.delete<ReminderParams>(
    "/:reminderId",
    validateRequest(reminderParamsSchema),
    requireWorkspacePermission("reminders.delete"),
    deleteReminderController
);

export { reminderRouter };