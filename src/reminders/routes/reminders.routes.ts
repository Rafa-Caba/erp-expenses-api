import { Router } from "express";

import {
    createReminderController,
    deleteReminderController,
    getReminderByIdController,
    getRemindersController,
    updateReminderController,
} from "../controllers/reminders.controller";
import {
    createReminderSchema,
    reminderParamsSchema,
    updateReminderSchema,
    workspaceReminderParamsSchema,
} from "../schemas/reminders.schemas";
import type {
    CreateReminderBody,
    ReminderParams,
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

reminderRouter.delete<ReminderParams>(
    "/:reminderId",
    validateRequest(reminderParamsSchema),
    requireWorkspacePermission("reminders.delete"),
    deleteReminderController
);

export { reminderRouter };