// src/cards/services/card.service.ts

import { Types } from "mongoose";

import { AccountModel } from "@/src/accounts/models/Account.model";
import { WorkspaceMemberModel } from "@/src/workspaces/models/WorkspaceMember.model";

import { CardModel, type CardDocument } from "../models/Card.model";
import type {
    CardResponseDto,
    CreateCardServiceInput,
    UpdateCardServiceInput,
} from "../types/card.types";

export class CardServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

function normalizeOptionalString(value?: string): string | null | undefined {
    if (value === undefined) {
        return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
}

function mapCardToDto(card: CardDocument): CardResponseDto {
    return {
        id: card._id.toString(),
        workspaceId: card.workspaceId.toString(),
        accountId: card.accountId.toString(),
        holderMemberId: card.holderMemberId ? card.holderMemberId.toString() : null,
        name: card.name,
        type: card.type,
        brand: card.brand ?? null,
        last4: card.last4,
        creditLimit: card.creditLimit ?? null,
        closingDay: card.closingDay ?? null,
        dueDay: card.dueDay ?? null,
        notes: card.notes ?? null,
        isActive: card.isActive,
        isArchived: card.isArchived ?? false,
        isVisible: card.isVisible ?? true,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
    };
}

async function validateHolderMemberId(
    workspaceId: Types.ObjectId,
    holderMemberId?: string
): Promise<Types.ObjectId | null> {
    if (!holderMemberId) {
        return null;
    }

    if (!Types.ObjectId.isValid(holderMemberId)) {
        throw new CardServiceError(
            "El holderMemberId no es válido.",
            400,
            "INVALID_HOLDER_MEMBER_ID"
        );
    }

    const parsedHolderMemberId = new Types.ObjectId(holderMemberId);

    const member = await WorkspaceMemberModel.findOne({
        _id: parsedHolderMemberId,
        workspaceId,
    }).select("_id");

    if (!member) {
        throw new CardServiceError(
            "El holderMemberId no pertenece a este workspace.",
            400,
            "HOLDER_MEMBER_NOT_IN_WORKSPACE"
        );
    }

    return parsedHolderMemberId;
}

async function validateAccountInWorkspace(
    workspaceId: Types.ObjectId,
    accountId: string
): Promise<{
    accountId: Types.ObjectId;
    accountType: "cash" | "bank" | "wallet" | "savings" | "credit";
}> {
    if (!Types.ObjectId.isValid(accountId)) {
        throw new CardServiceError(
            "El accountId no es válido.",
            400,
            "INVALID_ACCOUNT_ID"
        );
    }

    const parsedAccountId = new Types.ObjectId(accountId);

    const account = await AccountModel.findOne({
        _id: parsedAccountId,
        workspaceId,
    }).select("_id type");

    if (!account) {
        throw new CardServiceError(
            "La cuenta no pertenece a este workspace o no existe.",
            400,
            "ACCOUNT_NOT_IN_WORKSPACE"
        );
    }

    return {
        accountId: account._id,
        accountType: account.type,
    };
}

function assertCardTypeMatchesAccountType(input: {
    cardType: "debit" | "credit";
    accountType: "cash" | "bank" | "wallet" | "savings" | "credit";
}): void {
    if (input.cardType === "credit" && input.accountType !== "credit") {
        throw new CardServiceError(
            "Una tarjeta credit debe pertenecer a una cuenta tipo credit.",
            400,
            "CARD_ACCOUNT_TYPE_MISMATCH"
        );
    }

    if (input.cardType === "debit" && input.accountType === "credit") {
        throw new CardServiceError(
            "Una tarjeta debit no puede pertenecer a una cuenta tipo credit.",
            400,
            "CARD_ACCOUNT_TYPE_MISMATCH"
        );
    }
}

function resolveCreditFields(input: {
    type: "debit" | "credit";
    creditLimit?: number;
    closingDay?: number;
    dueDay?: number;
}): {
    creditLimit: number | null;
    closingDay: number | null;
    dueDay: number | null;
} {
    if (input.type !== "credit") {
        return {
            creditLimit: null,
            closingDay: null,
            dueDay: null,
        };
    }

    return {
        creditLimit: input.creditLimit ?? null,
        closingDay: input.closingDay ?? null,
        dueDay: input.dueDay ?? null,
    };
}

export function isCardServiceError(error: Error): error is CardServiceError {
    return error instanceof CardServiceError;
}

export async function getCardsService(
    workspaceId: Types.ObjectId
): Promise<CardResponseDto[]> {
    const cards = await CardModel.find({
        workspaceId,
        isArchived: false,
    }).sort({ createdAt: -1 });

    return cards.map(mapCardToDto);
}

export async function getCardByIdService(
    workspaceId: Types.ObjectId,
    cardId: Types.ObjectId
): Promise<CardResponseDto | null> {
    const card = await CardModel.findOne({
        _id: cardId,
        workspaceId,
    });

    if (!card) {
        return null;
    }

    return mapCardToDto(card);
}

export async function createCardService(
    input: CreateCardServiceInput
): Promise<CardResponseDto> {
    const validatedAccount = await validateAccountInWorkspace(
        input.workspaceId,
        input.body.accountId
    );

    assertCardTypeMatchesAccountType({
        cardType: input.body.type,
        accountType: validatedAccount.accountType,
    });

    const holderMemberObjectId = await validateHolderMemberId(
        input.workspaceId,
        input.body.holderMemberId
    );

    const creditFields = resolveCreditFields({
        type: input.body.type,
        creditLimit: input.body.creditLimit,
        closingDay: input.body.closingDay,
        dueDay: input.body.dueDay,
    });

    const card = await CardModel.create({
        workspaceId: input.workspaceId,
        accountId: validatedAccount.accountId,
        holderMemberId: holderMemberObjectId,
        name: input.body.name.trim(),
        type: input.body.type,
        brand: normalizeOptionalString(input.body.brand) ?? null,
        last4: input.body.last4.trim(),
        creditLimit: creditFields.creditLimit,
        closingDay: creditFields.closingDay,
        dueDay: creditFields.dueDay,
        notes: normalizeOptionalString(input.body.notes) ?? null,
        isActive: input.body.isActive ?? true,
        isArchived: input.body.isArchived ?? false,
        isVisible: input.body.isVisible ?? true,
    });

    return mapCardToDto(card);
}

export async function updateCardService(
    input: UpdateCardServiceInput
): Promise<CardResponseDto | null> {
    const card = await CardModel.findOne({
        _id: input.cardId,
        workspaceId: input.workspaceId,
    });

    if (!card) {
        return null;
    }

    let resolvedAccountId = card.accountId;
    let resolvedAccountType: "cash" | "bank" | "wallet" | "savings" | "credit" = "cash";

    if (input.body.accountId !== undefined) {
        const validatedAccount = await validateAccountInWorkspace(
            input.workspaceId,
            input.body.accountId
        );

        resolvedAccountId = validatedAccount.accountId;
        resolvedAccountType = validatedAccount.accountType;
    } else {
        const account = await AccountModel.findOne({
            _id: card.accountId,
            workspaceId: input.workspaceId,
        }).select("_id type");

        if (!account) {
            throw new CardServiceError(
                "La cuenta actual de la tarjeta no existe en este workspace.",
                400,
                "ACCOUNT_NOT_IN_WORKSPACE"
            );
        }

        resolvedAccountType = account.type;
    }

    const resolvedCardType = input.body.type ?? card.type;

    assertCardTypeMatchesAccountType({
        cardType: resolvedCardType,
        accountType: resolvedAccountType,
    });

    if (input.body.accountId !== undefined) {
        card.accountId = resolvedAccountId;
    }

    if (input.body.holderMemberId !== undefined) {
        card.holderMemberId = await validateHolderMemberId(
            input.workspaceId,
            input.body.holderMemberId
        );
    }

    if (input.body.name !== undefined) {
        card.name = input.body.name.trim();
    }

    if (input.body.type !== undefined) {
        card.type = input.body.type;
    }

    if (input.body.brand !== undefined) {
        card.brand = normalizeOptionalString(input.body.brand) ?? null;
    }

    if (input.body.last4 !== undefined) {
        card.last4 = input.body.last4.trim();
    }

    const creditFields = resolveCreditFields({
        type: resolvedCardType,
        creditLimit: input.body.creditLimit ?? card.creditLimit ?? undefined,
        closingDay: input.body.closingDay ?? card.closingDay ?? undefined,
        dueDay: input.body.dueDay ?? card.dueDay ?? undefined,
    });

    card.creditLimit = creditFields.creditLimit;
    card.closingDay = creditFields.closingDay;
    card.dueDay = creditFields.dueDay;

    if (input.body.notes !== undefined) {
        card.notes = normalizeOptionalString(input.body.notes) ?? null;
    }

    if (input.body.isActive !== undefined) {
        card.isActive = input.body.isActive;
    }

    if (input.body.isArchived !== undefined) {
        card.isArchived = input.body.isArchived;
    }

    if (input.body.isVisible !== undefined) {
        card.isVisible = input.body.isVisible;
    }

    await card.save();

    return mapCardToDto(card);
}

export async function archiveCardService(
    workspaceId: Types.ObjectId,
    cardId: Types.ObjectId
): Promise<CardResponseDto | null> {
    const card = await CardModel.findOneAndUpdate(
        {
            _id: cardId,
            workspaceId,
        },
        {
            isArchived: true,
            isActive: false,
        },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!card) {
        return null;
    }

    return mapCardToDto(card);
}