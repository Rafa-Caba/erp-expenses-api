// src/subscriptions/routes/subscriptions.routes.ts

import { Router } from "express";

import {
    createSubscriptionController,
    createSubscriptionTransactionController,
    deleteSubscriptionController,
    getSubscriptionByIdController,
    getSubscriptionsController,
    updateSubscriptionController,
} from "../controllers/subscriptions.controller";
import {
    createSubscriptionSchema,
    createSubscriptionTransactionSchema,
    subscriptionParamsSchema,
    updateSubscriptionSchema,
    workspaceSubscriptionParamsSchema,
} from "../schemas/subscription.schemas";
import type {
    CreateSubscriptionBody,
    CreateSubscriptionTransactionBody,
    SubscriptionParams,
    UpdateSubscriptionBody,
    WorkspaceSubscriptionParams,
} from "../types/subscription.types";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

const subscriptionRouter = Router({ mergeParams: true });

subscriptionRouter.use(requireWorkspaceAccess());

subscriptionRouter.get<WorkspaceSubscriptionParams>(
    "/",
    validateRequest(workspaceSubscriptionParamsSchema),
    requireWorkspacePermission("subscriptions.read"),
    getSubscriptionsController
);

subscriptionRouter.get<SubscriptionParams>(
    "/:subscriptionId",
    validateRequest(subscriptionParamsSchema),
    requireWorkspacePermission("subscriptions.read"),
    getSubscriptionByIdController
);

subscriptionRouter.post<WorkspaceSubscriptionParams, object, CreateSubscriptionBody>(
    "/",
    validateRequest(workspaceSubscriptionParamsSchema),
    validateRequest(createSubscriptionSchema),
    requireWorkspacePermission("subscriptions.create"),
    createSubscriptionController
);

subscriptionRouter.post<SubscriptionParams, object, CreateSubscriptionTransactionBody>(
    "/:subscriptionId/create-transaction",
    validateRequest(subscriptionParamsSchema),
    validateRequest(createSubscriptionTransactionSchema),
    requireWorkspacePermission("subscriptions.update"),
    requireWorkspacePermission("transactions.create"),
    createSubscriptionTransactionController
);

subscriptionRouter.patch<SubscriptionParams, object, UpdateSubscriptionBody>(
    "/:subscriptionId",
    validateRequest(subscriptionParamsSchema),
    validateRequest(updateSubscriptionSchema),
    requireWorkspacePermission("subscriptions.update"),
    updateSubscriptionController
);

subscriptionRouter.delete<SubscriptionParams>(
    "/:subscriptionId",
    validateRequest(subscriptionParamsSchema),
    requireWorkspacePermission("subscriptions.delete"),
    deleteSubscriptionController
);

export { subscriptionRouter };
