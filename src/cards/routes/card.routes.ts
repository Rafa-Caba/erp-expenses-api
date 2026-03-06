// src/cards/routes/card.routes.ts

import { Router } from "express";

import {
    archiveCardController,
    createCardController,
    getCardByIdController,
    getCardsController,
    updateCardController,
} from "../controllers/card.controller";
import {
    cardParamsSchema,
    createCardSchema,
    updateCardSchema,
    workspaceCardParamsSchema,
} from "../schemas/card.schemas";
import type {
    CardParams,
    CreateCardBody,
    UpdateCardBody,
    WorkspaceCardParams,
} from "../types/card.types";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

const cardRouter = Router({ mergeParams: true });

cardRouter.use(requireWorkspaceAccess());

cardRouter.get<WorkspaceCardParams>(
    "/",
    validateRequest(workspaceCardParamsSchema),
    requireWorkspacePermission("accounts.read"),
    getCardsController
);

cardRouter.get<CardParams>(
    "/:cardId",
    validateRequest(cardParamsSchema),
    requireWorkspacePermission("accounts.read"),
    getCardByIdController
);

cardRouter.post<WorkspaceCardParams, object, CreateCardBody>(
    "/",
    validateRequest(workspaceCardParamsSchema),
    validateRequest(createCardSchema),
    requireWorkspacePermission("accounts.create"),
    createCardController
);

cardRouter.patch<CardParams, object, UpdateCardBody>(
    "/:cardId",
    validateRequest(cardParamsSchema),
    validateRequest(updateCardSchema),
    requireWorkspacePermission("accounts.update"),
    updateCardController
);

cardRouter.delete<CardParams>(
    "/:cardId",
    validateRequest(cardParamsSchema),
    requireWorkspacePermission("accounts.delete"),
    archiveCardController
);

export { cardRouter };