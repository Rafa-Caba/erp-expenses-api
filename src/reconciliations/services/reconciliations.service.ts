// src/reconciliations/services/reconciliations.service.ts

import { Types } from "mongoose";

import { AccountModel } from "@/src/accounts/models/Account.model";
import { CardModel } from "@/src/cards/models/Card.model";
import { TransactionModel } from "@/src/transactions/models/Transaction.model";
import type { TransactionDocument } from "@/src/transactions/types/transaction.types";
import { WorkspaceMemberModel } from "@/src/workspaces/models/WorkspaceMember.model";
import type {
    CreateReconciliationServiceInput,
    DeleteReconciliationServiceInput,
    ReconciliationDifferenceDirection,
    ReconciliationDocument,
    ReconciliationListQuery,
    ReconciliationResponseDto,
    ReconciliationStatus,
    ReconciliationSummaryDto,
    UpdateReconciliationServiceInput,
} from "../types/reconciliations.types";
import { ReconciliationModel } from "../models/Reconciliation.model";

export class ReconciliationServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

type BooleanFilterInput = string | undefined;

type EnrichmentMaps = {
    accountNameById: Map<string, string>;
    cardNameById: Map<string, string>;
    memberDisplayNameById: Map<string, string>;
};

type ResolvedTransactionContext = {
    transaction: TransactionDocument;
    memberId: Types.ObjectId;
    entrySide: "account" | "destination_account" | "card";
};

function normalizeOptionalDate(value?: string | null): Date | null | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
        return null;
    }

    return new Date(trimmedValue);
}

function normalizeOptionalString(
    value?: string | null
): string | null | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length > 0 ? trimmedValue : null;
}

function parseBooleanQuery(value: BooleanFilterInput): boolean {
    if (!value) {
        return false;
    }

    const normalizedValue = value.trim().toLowerCase();

    return (
        normalizedValue === "true" ||
        normalizedValue === "1" ||
        normalizedValue === "yes" ||
        normalizedValue === "y" ||
        normalizedValue === "on"
    );
}

function startOfDay(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
}

function endOfDay(value: string): Date {
    return new Date(`${value}T23:59:59.999Z`);
}

function getDifferenceDirection(
    differenceAmount: number
): ReconciliationDifferenceDirection {
    if (differenceAmount === 0) {
        return "match";
    }

    if (differenceAmount > 0) {
        return "over";
    }

    return "under";
}

function computeDifferenceAmount(expectedAmount: number, actualAmount: number): number {
    return Number((actualAmount - expectedAmount).toFixed(2));
}

function resolveStatus(
    explicitStatus: ReconciliationStatus | undefined,
    differenceAmount: number
): ReconciliationStatus {
    if (explicitStatus !== undefined) {
        if (explicitStatus === "reconciled" && differenceAmount !== 0) {
            throw new ReconciliationServiceError(
                "Una conciliación marcada como reconciliada no puede tener diferencia.",
                400,
                "RECONCILIATION_STATUS_AMOUNT_MISMATCH"
            );
        }

        if (explicitStatus === "exception" && differenceAmount === 0) {
            throw new ReconciliationServiceError(
                "Una conciliación con excepción debe tener diferencia.",
                400,
                "RECONCILIATION_STATUS_AMOUNT_MISMATCH"
            );
        }

        return explicitStatus;
    }

    return differenceAmount === 0 ? "reconciled" : "exception";
}

function getUserObjectIdOrNull(userId?: Types.ObjectId | null): string | null {
    if (!userId) {
        return null;
    }

    return userId.toString();
}

async function buildEnrichmentMaps(
    reconciliations: ReconciliationDocument[]
): Promise<EnrichmentMaps> {
    const accountIds = Array.from(
        new Set(reconciliations.map((item) => item.accountId.toString()))
    ).map((value) => new Types.ObjectId(value));

    const cardIds = Array.from(
        new Set(
            reconciliations
                .map((item) => item.cardId?.toString() ?? null)
                .filter((value): value is string => value !== null)
        )
    ).map((value) => new Types.ObjectId(value));

    const memberIds = Array.from(
        new Set(reconciliations.map((item) => item.memberId.toString()))
    ).map((value) => new Types.ObjectId(value));

    const [accounts, cards, members] = await Promise.all([
        accountIds.length > 0
            ? AccountModel.find({ _id: { $in: accountIds } }).select("name")
            : Promise.resolve([]),
        cardIds.length > 0
            ? CardModel.find({ _id: { $in: cardIds } }).select("name")
            : Promise.resolve([]),
        memberIds.length > 0
            ? WorkspaceMemberModel.find({ _id: { $in: memberIds } }).select("displayName")
            : Promise.resolve([]),
    ]);

    return {
        accountNameById: new Map(
            accounts.map((account) => [account._id.toString(), account.name])
        ),
        cardNameById: new Map(
            cards.map((card) => [card._id.toString(), card.name])
        ),
        memberDisplayNameById: new Map(
            members.map((member) => [member._id.toString(), member.displayName])
        ),
    };
}

function mapReconciliationToDto(
    reconciliation: ReconciliationDocument,
    maps: EnrichmentMaps
): ReconciliationResponseDto {
    return {
        id: reconciliation._id.toString(),
        workspaceId: reconciliation.workspaceId.toString(),
        accountId: reconciliation.accountId.toString(),
        accountName:
            maps.accountNameById.get(reconciliation.accountId.toString()) ?? null,
        cardId: reconciliation.cardId?.toString() ?? null,
        cardName: reconciliation.cardId
            ? maps.cardNameById.get(reconciliation.cardId.toString()) ?? null
            : null,
        memberId: reconciliation.memberId.toString(),
        memberDisplayName:
            maps.memberDisplayNameById.get(reconciliation.memberId.toString()) ?? null,
        transactionId: reconciliation.transactionId.toString(),
        entrySide: reconciliation.entrySide,
        transactionType: reconciliation.transactionType,
        transactionStatus: reconciliation.transactionStatus,
        transactionDescription: reconciliation.transactionDescription,
        transactionDate: reconciliation.transactionDate,
        transactionAmount: reconciliation.transactionAmount,
        currency: reconciliation.currency,
        expectedAmount: reconciliation.expectedAmount,
        actualAmount: reconciliation.actualAmount,
        differenceAmount: reconciliation.differenceAmount,
        differenceDirection: getDifferenceDirection(reconciliation.differenceAmount),
        statementDate: reconciliation.statementDate ?? null,
        statementReference: reconciliation.statementReference ?? null,
        matchMethod: reconciliation.matchMethod,
        status: reconciliation.status,
        notes: reconciliation.notes ?? null,
        reconciledAt: reconciliation.reconciledAt ?? null,
        reconciledByUserId: getUserObjectIdOrNull(
            reconciliation.reconciledByUserId ?? null
        ),
        isActive: reconciliation.isActive,
        isArchived: reconciliation.isArchived ?? false,
        isVisible: reconciliation.isVisible ?? true,
        createdAt: reconciliation.createdAt,
        updatedAt: reconciliation.updatedAt,
    };
}

export function isReconciliationServiceError(
    error: Error
): error is ReconciliationServiceError {
    return error instanceof ReconciliationServiceError;
}

function buildListFilters(
    workspaceId: Types.ObjectId,
    query: ReconciliationListQuery
): Record<string, unknown> {
    const filters: Record<string, unknown> = {
        workspaceId,
    };

    if (query.accountId && Types.ObjectId.isValid(query.accountId)) {
        filters.accountId = new Types.ObjectId(query.accountId);
    }

    if (query.cardId && Types.ObjectId.isValid(query.cardId)) {
        filters.cardId = new Types.ObjectId(query.cardId);
    }

    if (query.memberId && Types.ObjectId.isValid(query.memberId)) {
        filters.memberId = new Types.ObjectId(query.memberId);
    }

    if (query.transactionId && Types.ObjectId.isValid(query.transactionId)) {
        filters.transactionId = new Types.ObjectId(query.transactionId);
    }

    if (query.status) {
        filters.status = query.status;
    }

    if (query.currency) {
        filters.currency = query.currency;
    }

    if (query.entrySide) {
        filters.entrySide = query.entrySide;
    }

    if (query.matchMethod) {
        filters.matchMethod = query.matchMethod;
    }

    if (!parseBooleanQuery(query.includeArchived)) {
        filters.isArchived = false;
    }

    if (!parseBooleanQuery(query.includeInactive)) {
        filters.isActive = true;
    }

    if (!parseBooleanQuery(query.includeHidden)) {
        filters.isVisible = true;
    }

    if (query.transactionDateFrom || query.transactionDateTo) {
        filters.transactionDate = {};

        if (query.transactionDateFrom) {
            (filters.transactionDate as Record<string, Date>).$gte = startOfDay(
                query.transactionDateFrom
            );
        }

        if (query.transactionDateTo) {
            (filters.transactionDate as Record<string, Date>).$lte = endOfDay(
                query.transactionDateTo
            );
        }
    }

    if (query.reconciledFrom || query.reconciledTo) {
        filters.reconciledAt = {};

        if (query.reconciledFrom) {
            (filters.reconciledAt as Record<string, Date>).$gte = startOfDay(
                query.reconciledFrom
            );
        }

        if (query.reconciledTo) {
            (filters.reconciledAt as Record<string, Date>).$lte = endOfDay(
                query.reconciledTo
            );
        }
    }

    if (query.statementDateFrom || query.statementDateTo) {
        filters.statementDate = {};

        if (query.statementDateFrom) {
            (filters.statementDate as Record<string, Date>).$gte = startOfDay(
                query.statementDateFrom
            );
        }

        if (query.statementDateTo) {
            (filters.statementDate as Record<string, Date>).$lte = endOfDay(
                query.statementDateTo
            );
        }
    }

    return filters;
}

async function resolveTransactionContext(args: {
    workspaceId: Types.ObjectId;
    accountId: Types.ObjectId;
    cardId?: Types.ObjectId | null;
    transactionId: Types.ObjectId;
}): Promise<ResolvedTransactionContext> {
    const transaction = await TransactionModel.findOne({
        _id: args.transactionId,
        workspaceId: args.workspaceId,
    });

    if (!transaction) {
        throw new ReconciliationServiceError(
            "La transacción no existe dentro del workspace.",
            404,
            "TRANSACTION_NOT_FOUND"
        );
    }

    if (transaction.status === "cancelled") {
        throw new ReconciliationServiceError(
            "No puedes conciliar una transacción cancelada.",
            400,
            "TRANSACTION_NOT_RECONCILIABLE"
        );
    }

    if (args.cardId) {
        if (!transaction.cardId || !transaction.cardId.equals(args.cardId)) {
            throw new ReconciliationServiceError(
                "La transacción no corresponde a la tarjeta enviada.",
                400,
                "RECONCILIATION_CARD_TRANSACTION_MISMATCH"
            );
        }

        if (
            transaction.accountId &&
            !transaction.accountId.equals(args.accountId) &&
            !transaction.destinationAccountId?.equals(args.accountId)
        ) {
            throw new ReconciliationServiceError(
                "La tarjeta enviada no corresponde con la cuenta objetivo de la transacción.",
                400,
                "RECONCILIATION_ACCOUNT_TRANSACTION_MISMATCH"
            );
        }

        return {
            transaction,
            memberId: transaction.memberId,
            entrySide: "card",
        };
    }

    if (transaction.accountId && transaction.accountId.equals(args.accountId)) {
        return {
            transaction,
            memberId: transaction.memberId,
            entrySide: "account",
        };
    }

    if (
        transaction.destinationAccountId &&
        transaction.destinationAccountId.equals(args.accountId)
    ) {
        return {
            transaction,
            memberId: transaction.memberId,
            entrySide: "destination_account",
        };
    }

    throw new ReconciliationServiceError(
        "La cuenta enviada no coincide con la transacción seleccionada.",
        400,
        "RECONCILIATION_ACCOUNT_TRANSACTION_MISMATCH"
    );
}

async function validateAccountAndCard(args: {
    workspaceId: Types.ObjectId;
    accountId: Types.ObjectId;
    cardId?: Types.ObjectId | null;
}): Promise<void> {
    const account = await AccountModel.findOne({
        _id: args.accountId,
        workspaceId: args.workspaceId,
    }).select("_id currency");

    if (!account) {
        throw new ReconciliationServiceError(
            "La cuenta no existe dentro del workspace.",
            404,
            "ACCOUNT_NOT_FOUND"
        );
    }

    if (!args.cardId) {
        return;
    }

    const card = await CardModel.findOne({
        _id: args.cardId,
        workspaceId: args.workspaceId,
    }).select("_id accountId");

    if (!card) {
        throw new ReconciliationServiceError(
            "La tarjeta no existe dentro del workspace.",
            404,
            "CARD_NOT_FOUND"
        );
    }

    if (!card.accountId.equals(args.accountId)) {
        throw new ReconciliationServiceError(
            "La tarjeta no pertenece a la cuenta enviada.",
            400,
            "RECONCILIATION_CARD_ACCOUNT_MISMATCH"
        );
    }
}

function getTransactionAbsoluteAmount(amount: number): number {
    return Number(Math.abs(amount).toFixed(2));
}

async function mapManyReconciliations(
    reconciliations: ReconciliationDocument[]
): Promise<ReconciliationResponseDto[]> {
    const maps = await buildEnrichmentMaps(reconciliations);
    return reconciliations.map((reconciliation) =>
        mapReconciliationToDto(reconciliation, maps)
    );
}

export async function getReconciliationsService(
    workspaceId: Types.ObjectId,
    query: ReconciliationListQuery
): Promise<ReconciliationResponseDto[]> {
    const filters = buildListFilters(workspaceId, query);

    const reconciliations = await ReconciliationModel.find(filters).sort({
        transactionDate: -1,
        createdAt: -1,
    });

    return mapManyReconciliations(reconciliations);
}

export async function getReconciliationByIdService(
    workspaceId: Types.ObjectId,
    reconciliationId: Types.ObjectId
): Promise<ReconciliationResponseDto | null> {
    const reconciliation = await ReconciliationModel.findOne({
        _id: reconciliationId,
        workspaceId,
    });

    if (!reconciliation) {
        return null;
    }

    const [dto] = await mapManyReconciliations([reconciliation]);
    return dto ?? null;
}

export async function getReconciliationSummaryService(
    workspaceId: Types.ObjectId,
    query: ReconciliationListQuery
): Promise<ReconciliationSummaryDto> {
    const filters = buildListFilters(workspaceId, query);

    const reconciliations = await ReconciliationModel.find(filters).sort({
        transactionDate: -1,
        createdAt: -1,
    });

    const maps = await buildEnrichmentMaps(reconciliations);

    const byAccountMap = new Map<
        string,
        {
            accountId: string;
            accountName: string | null;
            totalCount: number;
            reconciledCount: number;
            unreconciledCount: number;
            exceptionCount: number;
            expectedAmount: number;
            actualAmount: number;
            differenceAmount: number;
        }
    >();

    let latestReconciledAt: Date | null = null;

    const summary = reconciliations.reduce<ReconciliationSummaryDto>(
        (accumulator, item) => {
            const accountId = item.accountId.toString();
            const currentAccountSummary = byAccountMap.get(accountId) ?? {
                accountId,
                accountName: maps.accountNameById.get(accountId) ?? null,
                totalCount: 0,
                reconciledCount: 0,
                unreconciledCount: 0,
                exceptionCount: 0,
                expectedAmount: 0,
                actualAmount: 0,
                differenceAmount: 0,
            };

            currentAccountSummary.totalCount += 1;
            currentAccountSummary.expectedAmount += item.expectedAmount;
            currentAccountSummary.actualAmount += item.actualAmount;
            currentAccountSummary.differenceAmount += item.differenceAmount;

            if (item.status === "reconciled") {
                currentAccountSummary.reconciledCount += 1;
            } else if (item.status === "unreconciled") {
                currentAccountSummary.unreconciledCount += 1;
            } else {
                currentAccountSummary.exceptionCount += 1;
            }

            byAccountMap.set(accountId, currentAccountSummary);

            if (item.reconciledAt) {
                if (
                    latestReconciledAt === null ||
                    item.reconciledAt.getTime() > latestReconciledAt.getTime()
                ) {
                    latestReconciledAt = item.reconciledAt;
                }
            }

            return {
                totalCount: accumulator.totalCount + 1,
                reconciledCount:
                    accumulator.reconciledCount +
                    (item.status === "reconciled" ? 1 : 0),
                unreconciledCount:
                    accumulator.unreconciledCount +
                    (item.status === "unreconciled" ? 1 : 0),
                exceptionCount:
                    accumulator.exceptionCount +
                    (item.status === "exception" ? 1 : 0),
                hiddenCount:
                    accumulator.hiddenCount + (item.isVisible === false ? 1 : 0),
                archivedCount:
                    accumulator.archivedCount + (item.isArchived === true ? 1 : 0),
                inactiveCount:
                    accumulator.inactiveCount + (item.isActive === false ? 1 : 0),
                expectedAmount: accumulator.expectedAmount + item.expectedAmount,
                actualAmount: accumulator.actualAmount + item.actualAmount,
                differenceAmount:
                    accumulator.differenceAmount + item.differenceAmount,
                latestReconciledAt: null,
                byAccount: [],
            };
        },
        {
            totalCount: 0,
            reconciledCount: 0,
            unreconciledCount: 0,
            exceptionCount: 0,
            hiddenCount: 0,
            archivedCount: 0,
            inactiveCount: 0,
            expectedAmount: 0,
            actualAmount: 0,
            differenceAmount: 0,
            latestReconciledAt: null,
            byAccount: [],
        }
    );

    return {
        ...summary,
        latestReconciledAt,
        byAccount: Array.from(byAccountMap.values()).sort((left, right) =>
            left.accountName && right.accountName
                ? left.accountName.localeCompare(right.accountName)
                : left.accountId.localeCompare(right.accountId)
        ),
    };
}

export async function createReconciliationService(
    input: CreateReconciliationServiceInput
): Promise<ReconciliationResponseDto> {
    const accountId = new Types.ObjectId(input.body.accountId);
    const cardId = input.body.cardId ? new Types.ObjectId(input.body.cardId) : null;
    const transactionId = new Types.ObjectId(input.body.transactionId);

    await validateAccountAndCard({
        workspaceId: input.workspaceId,
        accountId,
        cardId,
    });

    const transactionContext = await resolveTransactionContext({
        workspaceId: input.workspaceId,
        accountId,
        cardId,
        transactionId,
    });

    const expectedAmount =
        input.body.expectedAmount ??
        getTransactionAbsoluteAmount(transactionContext.transaction.amount);

    const actualAmount = input.body.actualAmount ?? expectedAmount;
    const differenceAmount = computeDifferenceAmount(expectedAmount, actualAmount);
    const status = resolveStatus(input.body.status, differenceAmount);

    const existingReconciliation = await ReconciliationModel.findOne({
        workspaceId: input.workspaceId,
        transactionId,
        accountId,
        entrySide: transactionContext.entrySide,
    }).select("_id");

    if (existingReconciliation) {
        throw new ReconciliationServiceError(
            "Ya existe una conciliación para esa transacción en la cuenta y lado seleccionados.",
            409,
            "RECONCILIATION_ALREADY_EXISTS"
        );
    }

    const reconciliation = await ReconciliationModel.create({
        workspaceId: input.workspaceId,
        accountId,
        cardId,
        memberId: transactionContext.memberId,
        transactionId,
        entrySide: transactionContext.entrySide,
        transactionType: transactionContext.transaction.type,
        transactionStatus: transactionContext.transaction.status,
        transactionDescription: transactionContext.transaction.description,
        transactionDate: transactionContext.transaction.transactionDate,
        transactionAmount: getTransactionAbsoluteAmount(
            transactionContext.transaction.amount
        ),
        currency: transactionContext.transaction.currency,
        expectedAmount,
        actualAmount,
        differenceAmount,
        statementDate: normalizeOptionalDate(input.body.statementDate) ?? null,
        statementReference:
            normalizeOptionalString(input.body.statementReference) ?? null,
        matchMethod: input.body.matchMethod ?? "manual",
        status,
        notes: normalizeOptionalString(input.body.notes) ?? null,
        reconciledAt:
            normalizeOptionalDate(input.body.reconciledAt) ??
            (status === "unreconciled" ? null : new Date()),
        reconciledByUserId:
            input.reconciledByUserId && status !== "unreconciled"
                ? input.reconciledByUserId
                : null,
        isActive: true,
        isArchived: false,
        isVisible: input.body.isVisible ?? true,
    });

    const [dto] = await mapManyReconciliations([reconciliation]);
    return dto;
}

export async function updateReconciliationService(
    input: UpdateReconciliationServiceInput
): Promise<ReconciliationResponseDto | null> {
    const reconciliation = await ReconciliationModel.findOne({
        _id: input.reconciliationId,
        workspaceId: input.workspaceId,
    });

    if (!reconciliation) {
        return null;
    }

    const expectedAmount =
        input.body.expectedAmount ?? reconciliation.expectedAmount;
    const actualAmount =
        input.body.actualAmount ?? reconciliation.actualAmount;
    const differenceAmount = computeDifferenceAmount(expectedAmount, actualAmount);
    const status = resolveStatus(
        input.body.status ?? reconciliation.status,
        differenceAmount
    );

    reconciliation.expectedAmount = expectedAmount;
    reconciliation.actualAmount = actualAmount;
    reconciliation.differenceAmount = differenceAmount;
    reconciliation.status = status;

    if (input.body.statementDate !== undefined) {
        reconciliation.statementDate =
            normalizeOptionalDate(input.body.statementDate) ?? null;
    }

    if (input.body.statementReference !== undefined) {
        reconciliation.statementReference =
            normalizeOptionalString(input.body.statementReference) ?? null;
    }

    if (input.body.matchMethod !== undefined) {
        reconciliation.matchMethod = input.body.matchMethod;
    }

    if (input.body.notes !== undefined) {
        reconciliation.notes = normalizeOptionalString(input.body.notes) ?? null;
    }

    if (input.body.reconciledAt !== undefined) {
        reconciliation.reconciledAt =
            normalizeOptionalDate(input.body.reconciledAt) ?? null;
    } else if (status !== "unreconciled" && !reconciliation.reconciledAt) {
        reconciliation.reconciledAt = new Date();
    } else if (status === "unreconciled") {
        reconciliation.reconciledAt = null;
    }

    if (status === "unreconciled") {
        reconciliation.reconciledByUserId = null;
    } else if (input.reconciledByUserId) {
        reconciliation.reconciledByUserId = input.reconciledByUserId;
    }

    if (input.body.isActive !== undefined) {
        reconciliation.isActive = input.body.isActive;
    }

    if (input.body.isArchived !== undefined) {
        reconciliation.isArchived = input.body.isArchived;
    }

    if (input.body.isVisible !== undefined) {
        reconciliation.isVisible = input.body.isVisible;
    }

    await reconciliation.save();

    const [dto] = await mapManyReconciliations([reconciliation]);
    return dto;
}

export async function deleteReconciliationService(
    input: DeleteReconciliationServiceInput
): Promise<ReconciliationResponseDto | null> {
    const reconciliation = await ReconciliationModel.findOneAndDelete({
        _id: input.reconciliationId,
        workspaceId: input.workspaceId,
    });

    if (!reconciliation) {
        return null;
    }

    const [dto] = await mapManyReconciliations([reconciliation]);
    return dto;
}