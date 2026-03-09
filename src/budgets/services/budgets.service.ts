import { Types } from "mongoose";

import { BudgetModel } from "../models/Budget.model";
import { CategoryModel } from "@/src/categories/models/Category.model";
import { TransactionModel } from "@/src/transactions/models/Transaction.model";
import { WorkspaceMemberModel } from "@/src/workspaces/models/WorkspaceMember.model";
import type {
    BudgetComputedMetrics,
    BudgetDocument,
    BudgetResponseDto,
    BudgetStatus,
    CreateBudgetServiceInput,
    DeleteBudgetServiceInput,
    UpdateBudgetServiceInput,
} from "../types/budgets.types";

type OptionalObjectId = Types.ObjectId | null;

export class BudgetServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.name = "BudgetServiceError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

export function isBudgetServiceError(error: Error): error is BudgetServiceError {
    return error instanceof BudgetServiceError;
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
        throw new BudgetServiceError(
            "Uno de los ids enviados no es válido.",
            400,
            "INVALID_OBJECT_ID"
        );
    }

    return new Types.ObjectId(normalizedValue);
}

function parseRequiredDate(value: string): Date {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        throw new BudgetServiceError(
            "Una de las fechas enviadas no es válida.",
            400,
            "INVALID_BUDGET_DATE"
        );
    }

    return parsedDate;
}

function validateDates(startDate: Date, endDate: Date): void {
    if (endDate.getTime() < startDate.getTime()) {
        throw new BudgetServiceError(
            "La fecha de fin no puede ser anterior a la fecha de inicio.",
            400,
            "INVALID_BUDGET_DATE_RANGE"
        );
    }
}

function validateLimitAmount(limitAmount: number): void {
    if (limitAmount <= 0) {
        throw new BudgetServiceError(
            "El límite del presupuesto debe ser mayor a 0.",
            400,
            "INVALID_BUDGET_LIMIT_AMOUNT"
        );
    }
}

function validateAlertPercent(alertPercent: number | null | undefined): void {
    if (alertPercent === undefined || alertPercent === null) {
        return;
    }

    if (alertPercent < 1 || alertPercent > 100) {
        throw new BudgetServiceError(
            "El porcentaje de alerta debe estar entre 1 y 100.",
            400,
            "INVALID_BUDGET_ALERT_PERCENT"
        );
    }
}

async function validateCategoryIfProvided(
    workspaceId: Types.ObjectId,
    categoryId: OptionalObjectId
): Promise<void> {
    if (!categoryId) {
        return;
    }

    const category = await CategoryModel.findOne({
        _id: categoryId,
        workspaceId,
    }).lean<{
        _id: Types.ObjectId;
        type: "EXPENSE" | "INCOME" | "BOTH";
    } | null>();

    if (!category) {
        throw new BudgetServiceError(
            "La categoría no fue encontrada en el workspace.",
            400,
            "CATEGORY_NOT_FOUND"
        );
    }

    if (category.type === "INCOME") {
        throw new BudgetServiceError(
            "La categoría del presupuesto debe ser de gasto o mixta.",
            400,
            "INVALID_BUDGET_CATEGORY_TYPE"
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
        throw new BudgetServiceError(
            "El miembro no fue encontrado en el workspace.",
            400,
            "WORKSPACE_MEMBER_NOT_FOUND"
        );
    }
}

function resolveStoredBudgetStatus(args: {
    requestedStatus: BudgetStatus | undefined;
    isActive: boolean;
    startDate: Date;
    endDate: Date;
}): BudgetStatus {
    const { requestedStatus, isActive, startDate, endDate } = args;

    if (!isActive) {
        return "archived";
    }

    if (requestedStatus === "archived") {
        return "archived";
    }

    if (requestedStatus === "exceeded") {
        return "exceeded";
    }

    const now = Date.now();

    if (startDate.getTime() > now) {
        return "draft";
    }

    if (endDate.getTime() < now) {
        return "completed";
    }

    return requestedStatus ?? "active";
}

async function findBudgetById(
    workspaceId: Types.ObjectId,
    budgetId: Types.ObjectId
): Promise<BudgetDocument | null> {
    return BudgetModel.findOne({
        _id: budgetId,
        workspaceId,
    }).lean<BudgetDocument | null>();
}

function roundToTwoDecimals(value: number): number {
    return Number(value.toFixed(2));
}

function resolveComputedBudgetStatus(args: {
    budget: BudgetDocument;
    isExceeded: boolean;
}): BudgetStatus {
    const { budget, isExceeded } = args;

    if (!budget.isActive || budget.status === "archived") {
        return "archived";
    }

    const now = Date.now();

    if (budget.startDate.getTime() > now) {
        return "draft";
    }

    if (isExceeded) {
        return "exceeded";
    }

    if (budget.endDate.getTime() < now) {
        return "completed";
    }

    return "active";
}

async function computeBudgetMetrics(
    budget: BudgetDocument
): Promise<BudgetComputedMetrics> {
    const matchStage: {
        workspaceId: Types.ObjectId;
        type: "expense";
        status: "posted";
        currency: BudgetDocument["currency"];
        isActive: true;
        isArchived: false;
        transactionDate: {
            $gte: Date;
            $lte: Date;
        };
        categoryId?: Types.ObjectId;
        memberId?: Types.ObjectId;
    } = {
        workspaceId: budget.workspaceId,
        type: "expense",
        status: "posted",
        currency: budget.currency,
        isActive: true,
        isArchived: false,
        transactionDate: {
            $gte: budget.startDate,
            $lte: budget.endDate,
        },
    };

    if (budget.categoryId) {
        matchStage.categoryId = budget.categoryId;
    }

    if (budget.memberId) {
        matchStage.memberId = budget.memberId;
    }

    const aggregationResult = await TransactionModel.aggregate<{
        totalSpent: number;
        transactionCount: number;
    }>([
        {
            $match: matchStage,
        },
        {
            $group: {
                _id: null,
                totalSpent: {
                    $sum: "$amount",
                },
                transactionCount: {
                    $sum: 1,
                },
            },
        },
    ]);

    const spentAmount = roundToTwoDecimals(aggregationResult[0]?.totalSpent ?? 0);
    const matchedTransactionCount = aggregationResult[0]?.transactionCount ?? 0;
    const remainingAmount = roundToTwoDecimals(
        Math.max(0, budget.limitAmount - spentAmount)
    );
    const usagePercent =
        budget.limitAmount > 0
            ? roundToTwoDecimals((spentAmount / budget.limitAmount) * 100)
            : 0;
    const hasReachedAlert =
        budget.alertPercent !== undefined && budget.alertPercent !== null
            ? usagePercent >= budget.alertPercent
            : false;
    const isExceeded = spentAmount > budget.limitAmount;
    const computedStatus = resolveComputedBudgetStatus({
        budget,
        isExceeded,
    });

    return {
        spentAmount,
        remainingAmount,
        usagePercent,
        hasReachedAlert,
        isExceeded,
        matchedTransactionCount,
        computedStatus,
    };
}

async function buildBudgetResponse(
    budget: BudgetDocument
): Promise<BudgetResponseDto> {
    const metrics = await computeBudgetMetrics(budget);

    return {
        ...budget,
        categoryId: budget.categoryId ?? null,
        memberId: budget.memberId ?? null,
        alertPercent: budget.alertPercent ?? null,
        notes: budget.notes ?? null,
        isVisible: budget.isVisible ?? true,
        ...metrics,
    };
}

export async function getBudgetsService(
    workspaceId: Types.ObjectId
): Promise<BudgetResponseDto[]> {
    const budgets = await BudgetModel.find({
        workspaceId,
    })
        .sort({
            startDate: -1,
            createdAt: -1,
        })
        .lean<BudgetDocument[]>();

    return Promise.all(budgets.map((budget) => buildBudgetResponse(budget)));
}

export async function getBudgetByIdService(
    workspaceId: Types.ObjectId,
    budgetId: Types.ObjectId
): Promise<BudgetResponseDto | null> {
    const budget = await findBudgetById(workspaceId, budgetId);

    if (!budget) {
        return null;
    }

    return buildBudgetResponse(budget);
}

export async function createBudgetService(
    input: CreateBudgetServiceInput
): Promise<BudgetResponseDto> {
    const { workspaceId, body } = input;

    const startDate = parseRequiredDate(body.startDate);
    const endDate = parseRequiredDate(body.endDate);
    const categoryId = parseOptionalObjectId(body.categoryId);
    const memberId = parseOptionalObjectId(body.memberId);
    const isActive = body.isActive ?? true;

    validateDates(startDate, endDate);
    validateLimitAmount(body.limitAmount);
    validateAlertPercent(body.alertPercent);

    await validateCategoryIfProvided(workspaceId, categoryId);
    await validateMemberIfProvided(workspaceId, memberId);

    const status = resolveStoredBudgetStatus({
        requestedStatus: body.status,
        isActive,
        startDate,
        endDate,
    });

    const budget = await BudgetModel.create({
        workspaceId,
        name: body.name.trim(),
        periodType: body.periodType,
        startDate,
        endDate,
        limitAmount: body.limitAmount,
        currency: body.currency,
        categoryId,
        memberId,
        alertPercent: body.alertPercent ?? null,
        notes: normalizeNullableString(body.notes),
        isActive,
        status,
        isVisible: body.isVisible ?? true,
    });

    return buildBudgetResponse({
        _id: budget._id,
        workspaceId: budget.workspaceId,
        name: budget.name,
        periodType: budget.periodType,
        startDate: budget.startDate,
        endDate: budget.endDate,
        limitAmount: budget.limitAmount,
        currency: budget.currency,
        categoryId: budget.categoryId ?? null,
        memberId: budget.memberId ?? null,
        alertPercent: budget.alertPercent ?? null,
        notes: budget.notes ?? null,
        isActive: budget.isActive,
        status: budget.status,
        isVisible: budget.isVisible ?? true,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
    });
}

export async function updateBudgetService(
    input: UpdateBudgetServiceInput
): Promise<BudgetResponseDto | null> {
    const { workspaceId, budgetId, body } = input;

    const existingBudget = await findBudgetById(workspaceId, budgetId);

    if (!existingBudget) {
        return null;
    }

    const nextStartDate =
        body.startDate !== undefined
            ? parseRequiredDate(body.startDate)
            : existingBudget.startDate;

    const nextEndDate =
        body.endDate !== undefined
            ? parseRequiredDate(body.endDate)
            : existingBudget.endDate;

    const nextCategoryId =
        body.categoryId !== undefined
            ? parseOptionalObjectId(body.categoryId)
            : existingBudget.categoryId ?? null;

    const nextMemberId =
        body.memberId !== undefined
            ? parseOptionalObjectId(body.memberId)
            : existingBudget.memberId ?? null;

    const nextLimitAmount =
        body.limitAmount !== undefined ? body.limitAmount : existingBudget.limitAmount;

    const nextIsActive =
        body.isActive !== undefined ? body.isActive : existingBudget.isActive;

    const nextAlertPercent =
        body.alertPercent !== undefined
            ? body.alertPercent
            : existingBudget.alertPercent ?? null;

    validateDates(nextStartDate, nextEndDate);
    validateLimitAmount(nextLimitAmount);
    validateAlertPercent(nextAlertPercent);

    await validateCategoryIfProvided(workspaceId, nextCategoryId);
    await validateMemberIfProvided(workspaceId, nextMemberId);

    const nextStatus = resolveStoredBudgetStatus({
        requestedStatus: body.status ?? existingBudget.status,
        isActive: nextIsActive,
        startDate: nextStartDate,
        endDate: nextEndDate,
    });

    const updatedBudget = await BudgetModel.findOneAndUpdate(
        {
            _id: budgetId,
            workspaceId,
        },
        {
            $set: {
                name:
                    body.name !== undefined
                        ? body.name.trim()
                        : existingBudget.name,
                periodType:
                    body.periodType !== undefined
                        ? body.periodType
                        : existingBudget.periodType,
                startDate: nextStartDate,
                endDate: nextEndDate,
                limitAmount: nextLimitAmount,
                currency:
                    body.currency !== undefined
                        ? body.currency
                        : existingBudget.currency,
                categoryId: nextCategoryId,
                memberId: nextMemberId,
                alertPercent: nextAlertPercent,
                notes:
                    body.notes !== undefined
                        ? normalizeNullableString(body.notes)
                        : existingBudget.notes ?? null,
                isActive: nextIsActive,
                status: nextStatus,
                isVisible:
                    body.isVisible !== undefined
                        ? body.isVisible
                        : existingBudget.isVisible ?? true,
            },
        },
        {
            new: true,
        }
    ).lean<BudgetDocument | null>();

    if (!updatedBudget) {
        return null;
    }

    return buildBudgetResponse(updatedBudget);
}

export async function deleteBudgetService(
    input: DeleteBudgetServiceInput
): Promise<BudgetDocument | null> {
    const { workspaceId, budgetId } = input;

    return BudgetModel.findOneAndDelete({
        _id: budgetId,
        workspaceId,
    }).lean<BudgetDocument | null>();
}