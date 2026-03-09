import { Types } from "mongoose";

import { AccountModel } from "@/src/accounts/models/Account.model";
import { WorkspaceMemberModel } from "@/src/workspaces/models/WorkspaceMember.model";
import { SavingGoalModel } from "../models/SavingGoal.model";
import type {
    CreateSavingsGoalServiceInput,
    DeleteSavingsGoalServiceInput,
    SavingsGoalDocument,
    SavingsGoalStatus,
    UpdateSavingsGoalServiceInput,
} from "../types/savingGoals.types";

type OptionalObjectId = Types.ObjectId | null;

export interface SavingsGoalResponseDto extends SavingsGoalDocument {
    remainingAmount: number;
    progressPercent: number;
}

export class SavingGoalServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.name = "SavingGoalServiceError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

export function isSavingGoalServiceError(error: Error): error is SavingGoalServiceError {
    return error instanceof SavingGoalServiceError;
}

function normalizeNullableString(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}

function parseOptionalObjectId(value: string | null | undefined): OptionalObjectId {
    if (value === undefined || value === null) {
        return null;
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
        return null;
    }

    if (!Types.ObjectId.isValid(normalizedValue)) {
        throw new SavingGoalServiceError(
            "Uno de los ids enviados no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(normalizedValue);
}

function parseOptionalDate(value: string | null | undefined): Date | null {
    if (value === undefined || value === null) {
        return null;
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        throw new SavingGoalServiceError(
            "La fecha objetivo no es válida.",
            400,
            "INVALID_TARGET_DATE"
        );
    }

    return parsedDate;
}

function validateAmounts(targetAmount: number, currentAmount: number): void {
    if (targetAmount <= 0) {
        throw new SavingGoalServiceError(
            "La meta objetivo debe ser mayor a 0.",
            400,
            "INVALID_TARGET_AMOUNT"
        );
    }

    if (currentAmount < 0) {
        throw new SavingGoalServiceError(
            "El monto actual no puede ser menor a 0.",
            400,
            "INVALID_CURRENT_AMOUNT"
        );
    }

    if (currentAmount > targetAmount) {
        throw new SavingGoalServiceError(
            "El monto actual no puede ser mayor a la meta objetivo.",
            400,
            "CURRENT_AMOUNT_EXCEEDS_TARGET"
        );
    }
}

function resolveSavingsGoalStatus(
    requestedStatus: SavingsGoalStatus | undefined,
    targetAmount: number,
    currentAmount: number
): SavingsGoalStatus {
    if (requestedStatus === "cancelled") {
        return "cancelled";
    }

    if (requestedStatus === "paused") {
        return "paused";
    }

    if (requestedStatus === "completed" && currentAmount < targetAmount) {
        throw new SavingGoalServiceError(
            "Una meta completada debe tener el monto actual igual a la meta objetivo.",
            400,
            "INVALID_COMPLETED_STATUS"
        );
    }

    if (currentAmount === targetAmount) {
        return "completed";
    }

    return requestedStatus ?? "active";
}

async function validateAccountIfProvided(
    workspaceId: Types.ObjectId,
    accountId: OptionalObjectId
): Promise<void> {
    if (!accountId) {
        return;
    }

    const account = await AccountModel.exists({
        _id: accountId,
        workspaceId,
        isArchived: { $ne: true },
    });

    if (!account) {
        throw new SavingGoalServiceError(
            "La cuenta no fue encontrada en el workspace.",
            400,
            "ACCOUNT_NOT_FOUND"
        );
    }
}

async function validateMemberIfProvided(
    workspaceId: Types.ObjectId,
    memberId: OptionalObjectId
): Promise<void> {
    if (!memberId) {
        return;
    }

    const member = await WorkspaceMemberModel.exists({
        _id: memberId,
        workspaceId,
        status: "active",
    });

    if (!member) {
        throw new SavingGoalServiceError(
            "El miembro no fue encontrado en el workspace.",
            400,
            "WORKSPACE_MEMBER_NOT_FOUND"
        );
    }
}

function roundToTwoDecimals(value: number): number {
    return Number(value.toFixed(2));
}

function buildSavingGoalResponse(
    savingGoal: SavingsGoalDocument
): SavingsGoalResponseDto {
    const remainingAmount = roundToTwoDecimals(
        Math.max(0, savingGoal.targetAmount - savingGoal.currentAmount)
    );

    const progressPercent =
        savingGoal.targetAmount > 0
            ? roundToTwoDecimals((savingGoal.currentAmount / savingGoal.targetAmount) * 100)
            : 0;

    return {
        ...savingGoal,
        accountId: savingGoal.accountId ?? null,
        memberId: savingGoal.memberId ?? null,
        description: savingGoal.description ?? null,
        targetDate: savingGoal.targetDate ?? null,
        priority: savingGoal.priority ?? null,
        isVisible: savingGoal.isVisible ?? true,
        remainingAmount,
        progressPercent,
    };
}

async function findSavingGoalById(
    workspaceId: Types.ObjectId,
    savingsGoalId: Types.ObjectId
): Promise<SavingsGoalDocument | null> {
    return SavingGoalModel.findOne({
        _id: savingsGoalId,
        workspaceId,
    }).lean<SavingsGoalDocument | null>();
}

export async function getSavingGoalsService(
    workspaceId: Types.ObjectId
): Promise<SavingsGoalResponseDto[]> {
    const savingGoals = await SavingGoalModel.find({
        workspaceId,
    })
        .sort({
            createdAt: -1,
        })
        .lean<SavingsGoalDocument[]>();

    return savingGoals.map((savingGoal) => buildSavingGoalResponse(savingGoal));
}

export async function getSavingGoalByIdService(
    workspaceId: Types.ObjectId,
    savingsGoalId: Types.ObjectId
): Promise<SavingsGoalResponseDto | null> {
    const savingGoal = await findSavingGoalById(workspaceId, savingsGoalId);

    if (!savingGoal) {
        return null;
    }

    return buildSavingGoalResponse(savingGoal);
}

export async function createSavingGoalService(
    input: CreateSavingsGoalServiceInput
): Promise<SavingsGoalResponseDto> {
    const { workspaceId, body } = input;

    const accountId = parseOptionalObjectId(body.accountId);
    const memberId = parseOptionalObjectId(body.memberId);
    const targetDate = parseOptionalDate(body.targetDate);

    validateAmounts(body.targetAmount, body.currentAmount);

    await validateAccountIfProvided(workspaceId, accountId);
    await validateMemberIfProvided(workspaceId, memberId);

    const status = resolveSavingsGoalStatus(
        body.status,
        body.targetAmount,
        body.currentAmount
    );

    const savingGoal = await SavingGoalModel.create({
        workspaceId,
        accountId,
        memberId,
        name: body.name.trim(),
        description: normalizeNullableString(body.description),
        targetAmount: body.targetAmount,
        currentAmount: body.currentAmount,
        currency: body.currency,
        targetDate,
        status,
        priority: body.priority ?? null,
        category: body.category ?? "custom",
        isVisible: body.isVisible ?? true,
    });

    return buildSavingGoalResponse({
        _id: savingGoal._id,
        workspaceId: savingGoal.workspaceId,
        accountId: savingGoal.accountId ?? null,
        memberId: savingGoal.memberId ?? null,
        name: savingGoal.name,
        description: savingGoal.description ?? null,
        targetAmount: savingGoal.targetAmount,
        currentAmount: savingGoal.currentAmount,
        currency: savingGoal.currency,
        targetDate: savingGoal.targetDate ?? null,
        status: savingGoal.status,
        priority: savingGoal.priority ?? null,
        category: savingGoal.category,
        isVisible: savingGoal.isVisible ?? true,
        createdAt: savingGoal.createdAt,
        updatedAt: savingGoal.updatedAt,
    });
}

export async function updateSavingGoalService(
    input: UpdateSavingsGoalServiceInput
): Promise<SavingsGoalResponseDto | null> {
    const { workspaceId, savingsGoalId, body } = input;

    const existingSavingGoal = await findSavingGoalById(workspaceId, savingsGoalId);

    if (!existingSavingGoal) {
        return null;
    }

    const nextAccountId =
        body.accountId !== undefined
            ? parseOptionalObjectId(body.accountId)
            : existingSavingGoal.accountId ?? null;

    const nextMemberId =
        body.memberId !== undefined
            ? parseOptionalObjectId(body.memberId)
            : existingSavingGoal.memberId ?? null;

    const nextTargetDate =
        body.targetDate !== undefined
            ? parseOptionalDate(body.targetDate)
            : existingSavingGoal.targetDate ?? null;

    const nextTargetAmount =
        body.targetAmount !== undefined
            ? body.targetAmount
            : existingSavingGoal.targetAmount;

    const nextCurrentAmount =
        body.currentAmount !== undefined
            ? body.currentAmount
            : existingSavingGoal.currentAmount;

    validateAmounts(nextTargetAmount, nextCurrentAmount);

    await validateAccountIfProvided(workspaceId, nextAccountId);
    await validateMemberIfProvided(workspaceId, nextMemberId);

    const nextStatus = resolveSavingsGoalStatus(
        body.status !== undefined ? body.status : existingSavingGoal.status,
        nextTargetAmount,
        nextCurrentAmount
    );

    const updatedSavingGoal = await SavingGoalModel.findOneAndUpdate(
        {
            _id: savingsGoalId,
            workspaceId,
        },
        {
            $set: {
                accountId: nextAccountId,
                memberId: nextMemberId,
                name:
                    body.name !== undefined
                        ? body.name.trim()
                        : existingSavingGoal.name,
                description:
                    body.description !== undefined
                        ? normalizeNullableString(body.description)
                        : existingSavingGoal.description ?? null,
                targetAmount: nextTargetAmount,
                currentAmount: nextCurrentAmount,
                currency:
                    body.currency !== undefined
                        ? body.currency
                        : existingSavingGoal.currency,
                targetDate: nextTargetDate,
                status: nextStatus,
                priority:
                    body.priority !== undefined
                        ? body.priority
                        : existingSavingGoal.priority ?? null,
                category:
                    body.category !== undefined
                        ? body.category
                        : existingSavingGoal.category,
                isVisible:
                    body.isVisible !== undefined
                        ? body.isVisible
                        : existingSavingGoal.isVisible ?? true,
            },
        },
        {
            new: true,
        }
    ).lean<SavingsGoalDocument | null>();

    if (!updatedSavingGoal) {
        return null;
    }

    return buildSavingGoalResponse(updatedSavingGoal);
}

export async function deleteSavingGoalService(
    input: DeleteSavingsGoalServiceInput
): Promise<SavingsGoalDocument | null> {
    const { workspaceId, savingsGoalId } = input;

    return SavingGoalModel.findOneAndDelete({
        _id: savingsGoalId,
        workspaceId,
    }).lean<SavingsGoalDocument | null>();
}