// src/cards/controllers/card.controller.ts

import type { RequestHandler } from "express";
import { Types } from "mongoose";

import {
    archiveCardService,
    createCardService,
    getCardByIdService,
    getCardsService,
    isCardServiceError,
    updateCardService,
    CardServiceError,
} from "../services/card.service";
import type {
    CardParams,
    CreateCardBody,
    UpdateCardBody,
    WorkspaceCardParams,
} from "../types/card.types";

function getObjectIdOrThrow(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
        throw new CardServiceError(
            "El id proporcionado no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(value);
}

export const getCardsController: RequestHandler<
    WorkspaceCardParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const cards = await getCardsService(workspaceId);

        res.status(200).json({
            message: "Tarjetas obtenidas correctamente.",
            cards,
        });
    } catch (error) {
        if (error instanceof Error && isCardServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const getCardByIdController: RequestHandler<
    CardParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const cardId = getObjectIdOrThrow(req.params.cardId);

        const card = await getCardByIdService(workspaceId, cardId);

        if (!card) {
            res.status(404).json({
                code: "CARD_NOT_FOUND",
                message: "Tarjeta no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Tarjeta obtenida correctamente.",
            card,
        });
    } catch (error) {
        if (error instanceof Error && isCardServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const createCardController: RequestHandler<
    WorkspaceCardParams,
    object,
    CreateCardBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);

        const card = await createCardService({
            workspaceId,
            body: req.body,
        });

        res.status(201).json({
            message: "Tarjeta creada correctamente.",
            card,
        });
    } catch (error) {
        if (error instanceof Error && isCardServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const updateCardController: RequestHandler<
    CardParams,
    object,
    UpdateCardBody
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const cardId = getObjectIdOrThrow(req.params.cardId);

        const card = await updateCardService({
            workspaceId,
            cardId,
            body: req.body,
        });

        if (!card) {
            res.status(404).json({
                code: "CARD_NOT_FOUND",
                message: "Tarjeta no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Tarjeta actualizada correctamente.",
            card,
        });
    } catch (error) {
        if (error instanceof Error && isCardServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};

export const archiveCardController: RequestHandler<
    CardParams
> = async (req, res, next): Promise<void> => {
    try {
        if (!req.workspace) {
            res.status(404).json({
                code: "WORKSPACE_NOT_FOUND",
                message: "Workspace no encontrado.",
            });
            return;
        }

        const workspaceId = getObjectIdOrThrow(req.params.workspaceId);
        const cardId = getObjectIdOrThrow(req.params.cardId);

        const card = await archiveCardService(workspaceId, cardId);

        if (!card) {
            res.status(404).json({
                code: "CARD_NOT_FOUND",
                message: "Tarjeta no encontrada.",
            });
            return;
        }

        res.status(200).json({
            message: "Tarjeta archivada correctamente.",
            card,
        });
    } catch (error) {
        if (error instanceof Error && isCardServiceError(error)) {
            res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
            });
            return;
        }

        next(error);
    }
};