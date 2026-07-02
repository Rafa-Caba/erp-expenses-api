// src/reports/services/reports.service.ts

import { Types } from "mongoose";

import { BudgetModel } from "@/src/budgets/models/Budget.model";
import type { BudgetDocument, BudgetStatus } from "@/src/budgets/types/budgets.types";
import { CategoryModel } from "@/src/categories/models/Category.model";
import { DebtModel } from "@/src/debts/models/Debt.model";
import { deleteFromCloudinary } from "@/src/middlewares/cloudinaryUploads";
import { PaymentModel } from "@/src/payments/models/Payment.model";
import type { CashflowDirection, CurrencyCode } from "@/src/shared/types/common";
import { TransactionModel } from "@/src/transactions/models/Transaction.model";
import { WorkspaceMemberModel } from "@/src/workspaces/models/WorkspaceMember.model";
import { ReportModel } from "../models/Report.model";
import type {
    BudgetSummaryItem,
    BudgetSummaryReport,
    BudgetSummarySeriesItem,
    CategoryBreakdownItem,
    CategoryBreakdownReport,
    CategoryBreakdownSeriesItem,
    CategoryBreakdownType,
    CreateReportServiceInput,
    DebtSummaryReport,
    DebtSummarySeriesItem,
    DeleteReportServiceInput,
    MonthlySummaryCategoryItem,
    MonthlySummaryReport,
    MonthlySummarySeriesItem,
    ReportAnalyticsQuery,
    ReportDocument,
    ReportFilters,
    ReportFileResourceType,
    ReportGroupBy,
    ReportStatus,
    UpdateReportServiceInput,
} from "../types/reports.types";

type OptionalObjectId = Types.ObjectId | null;

interface NormalizedAnalyticsFilters {
    dateFrom: Date | null;
    dateTo: Date | null;
    currency: CurrencyCode | null;
    memberId: OptionalObjectId;
    categoryId: OptionalObjectId;
    accountId: OptionalObjectId;
    cardId: OptionalObjectId;
    includeArchived: boolean;
    groupBy: ReportGroupBy;
    type: CategoryBreakdownType;
}

interface BaseTransactionMatch {
    workspaceId: Types.ObjectId;
    status: "posted";
    isActive: true;
    isArchived?: boolean;
    transactionDate?: {
        $gte?: Date;
        $lte?: Date;
    };
    currency?: CurrencyCode;
    memberId?: Types.ObjectId;
    categoryId?: Types.ObjectId;
    accountId?: Types.ObjectId;
    cardId?: Types.ObjectId;
    type?: string | { $in: string[] };
}

interface BasePaymentMatch {
    workspaceId: Types.ObjectId;
    status: "completed";
    currency?: CurrencyCode;
    memberId?: Types.ObjectId;
    accountId?: Types.ObjectId;
    cardId?: Types.ObjectId;
    paymentDate?: {
        $gte?: Date;
        $lte?: Date;
    };
}

interface TransactionAnalyticsItem {
    _id: Types.ObjectId;
    type: "income" | "expense" | "transfer" | "debt_payment" | "adjustment";
    amount: number;
    cashflowDirection?: CashflowDirection | null;
    categoryId?: Types.ObjectId | null;
    memberId?: Types.ObjectId | null;
    transactionDate: Date;
}

interface PaymentAnalyticsItem {
    _id: Types.ObjectId;
    amount: number;
    principalAmount?: number | null;
    feeAmount?: number | null;
    cashflowDirection?: CashflowDirection | null;
    paymentDate: Date;
}

interface DebtAnalyticsItem {
    _id: Types.ObjectId;
    type: "owed_by_me" | "owed_to_me";
    originalAmount: number;
    remainingAmount: number;
    status: "active" | "paid" | "overdue" | "cancelled";
    startDate: Date;
}

export class ReportServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.name = "ReportServiceError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

export function isReportServiceError(error: Error): error is ReportServiceError {
    return error instanceof ReportServiceError;
}

function normalizeNullableString(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeReportFileResourceType(
    value: ReportFileResourceType | null | undefined
): ReportFileResourceType | null {
    return value ?? null;
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
        throw new ReportServiceError(
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
        throw new ReportServiceError(
            "La fecha enviada no es válida.",
            400,
            "INVALID_DATE"
        );
    }

    return parsedDate;
}

function normalizeFilters(filters: ReportFilters | null | undefined): ReportFilters | null {
    if (!filters) {
        return null;
    }

    return {
        dateFrom: normalizeNullableString(filters.dateFrom),
        dateTo: normalizeNullableString(filters.dateTo),
        currency: filters.currency ?? null,
        memberId: normalizeNullableString(filters.memberId),
        categoryId: normalizeNullableString(filters.categoryId),
        accountId: normalizeNullableString(filters.accountId),
        cardId: normalizeNullableString(filters.cardId),
        includeArchived: filters.includeArchived ?? null,
        groupBy: filters.groupBy ?? null,
    };
}

function validateFilters(filters: ReportFilters | null): void {
    if (!filters) {
        return;
    }

    if (filters.dateFrom && filters.dateTo) {
        const parsedDateFrom = new Date(filters.dateFrom);
        const parsedDateTo = new Date(filters.dateTo);

        if (parsedDateTo.getTime() < parsedDateFrom.getTime()) {
            throw new ReportServiceError(
                "La fecha final del filtro no puede ser anterior a la fecha inicial.",
                400,
                "INVALID_REPORT_FILTER_DATE_RANGE"
            );
        }
    }
}

function resolveReportStatus(
    requestedStatus: ReportStatus | undefined,
    generatedAt: Date | null
): ReportStatus {
    if (requestedStatus === "archived") {
        return "archived";
    }

    if (requestedStatus === "failed") {
        return "failed";
    }

    if (requestedStatus === "pending") {
        return "pending";
    }

    if (generatedAt) {
        return requestedStatus ?? "generated";
    }

    return requestedStatus ?? "pending";
}

function normalizeGeneratedAtForStatus(
    status: ReportStatus,
    generatedAt: Date | null
): Date | null {
    if (status === "pending" || status === "failed") {
        return null;
    }

    return generatedAt;
}

async function validateGeneratedByMemberIfProvided(
    workspaceId: Types.ObjectId,
    generatedByMemberId: OptionalObjectId
): Promise<void> {
    if (!generatedByMemberId) {
        return;
    }

    const member = await WorkspaceMemberModel.exists({
        _id: generatedByMemberId,
        workspaceId,
        status: "active",
    });

    if (!member) {
        throw new ReportServiceError(
            "El miembro generador no fue encontrado en el workspace.",
            400,
            "WORKSPACE_MEMBER_NOT_FOUND"
        );
    }
}

function buildReportResponse(report: ReportDocument): ReportDocument {
    return {
        ...report,
        filters: report.filters ?? null,
        generatedByMemberId: report.generatedByMemberId ?? null,
        fileUrl: report.fileUrl ?? null,
        filePublicId: report.filePublicId ?? null,
        fileResourceType: report.fileResourceType ?? null,
        fileName: report.fileName ?? null,
        fileFormat: report.fileFormat ?? null,
        notes: report.notes ?? null,
        isVisible: report.isVisible ?? true,
        generatedAt: report.generatedAt ?? null,
    };
}

async function deleteStoredReportFileIfNeeded(
    report: Pick<ReportDocument, "filePublicId" | "fileResourceType">
): Promise<void> {
    if (!report.filePublicId) {
        return;
    }

    await deleteFromCloudinary(
        report.filePublicId,
        report.fileResourceType ?? "raw"
    );
}

async function findReportById(
    workspaceId: Types.ObjectId,
    reportId: Types.ObjectId
): Promise<ReportDocument | null> {
    return ReportModel.findOne({
        _id: reportId,
        workspaceId,
    }).lean<ReportDocument | null>();
}

function roundToTwoDecimals(value: number): number {
    return Number(value.toFixed(2));
}

function normalizeAnalyticsQuery(
    query: ReportAnalyticsQuery | undefined
): NormalizedAnalyticsFilters {
    return {
        dateFrom: parseOptionalDate(query?.dateFrom),
        dateTo: parseOptionalDate(query?.dateTo),
        currency: query?.currency ?? null,
        memberId: parseOptionalObjectId(query?.memberId),
        categoryId: parseOptionalObjectId(query?.categoryId),
        accountId: parseOptionalObjectId(query?.accountId),
        cardId: parseOptionalObjectId(query?.cardId),
        includeArchived: query?.includeArchived ?? false,
        groupBy: query?.groupBy ?? "day",
        type: query?.type ?? "expense",
    };
}

function buildBaseTransactionMatch(
    workspaceId: Types.ObjectId,
    filters: NormalizedAnalyticsFilters
): BaseTransactionMatch {
    const matchStage: BaseTransactionMatch = {
        workspaceId,
        status: "posted",
        isActive: true,
    };

    if (!filters.includeArchived) {
        matchStage.isArchived = false;
    }

    if (filters.dateFrom || filters.dateTo) {
        matchStage.transactionDate = {};

        if (filters.dateFrom) {
            matchStage.transactionDate.$gte = filters.dateFrom;
        }

        if (filters.dateTo) {
            matchStage.transactionDate.$lte = filters.dateTo;
        }
    }

    if (filters.currency) {
        matchStage.currency = filters.currency;
    }

    if (filters.memberId) {
        matchStage.memberId = filters.memberId;
    }

    if (filters.categoryId) {
        matchStage.categoryId = filters.categoryId;
    }

    if (filters.accountId) {
        matchStage.accountId = filters.accountId;
    }

    if (filters.cardId) {
        matchStage.cardId = filters.cardId;
    }

    return matchStage;
}

function buildBasePaymentMatch(
    workspaceId: Types.ObjectId,
    filters: NormalizedAnalyticsFilters
): BasePaymentMatch {
    const matchStage: BasePaymentMatch = {
        workspaceId,
        status: "completed",
    };

    if (filters.currency) {
        matchStage.currency = filters.currency;
    }

    if (filters.memberId) {
        matchStage.memberId = filters.memberId;
    }

    if (filters.accountId) {
        matchStage.accountId = filters.accountId;
    }

    if (filters.cardId) {
        matchStage.cardId = filters.cardId;
    }

    if (filters.dateFrom || filters.dateTo) {
        matchStage.paymentDate = {};

        if (filters.dateFrom) {
            matchStage.paymentDate.$gte = filters.dateFrom;
        }

        if (filters.dateTo) {
            matchStage.paymentDate.$lte = filters.dateTo;
        }
    }

    return matchStage;
}

function getTransactionAmountForNetBalance(transaction: TransactionAnalyticsItem): number {
    if (transaction.type === "adjustment" && transaction.cashflowDirection === "out") {
        return -transaction.amount;
    }

    return transaction.amount;
}

function isDebtCollectionCashflow(
    cashflowDirection: CashflowDirection | null | undefined
): boolean {
    return cashflowDirection === "in";
}

function getPaymentPrincipalAmount(payment: PaymentAnalyticsItem): number {
    return payment.principalAmount ?? payment.amount;
}

function getPaymentFeeAmount(payment: PaymentAnalyticsItem): number {
    return payment.feeAmount ?? 0;
}

function isPaymentCollection(payment: PaymentAnalyticsItem): boolean {
    return payment.cashflowDirection === "in";
}

function padNumber(value: number): string {
    return value.toString().padStart(2, "0");
}

function getUtcDateStart(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDayLabel(date: Date): string {
    return `${date.getUTCFullYear()}-${padNumber(date.getUTCMonth() + 1)}-${padNumber(
        date.getUTCDate()
    )}`;
}

function getIsoWeekData(date: Date): { year: number; week: number } {
    const utcDate = getUtcDateStart(date);
    const dayNumber = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);

    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil(
        ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );

    return {
        year: utcDate.getUTCFullYear(),
        week: weekNumber,
    };
}

function formatWeekLabel(date: Date): string {
    const isoWeek = getIsoWeekData(date);

    return `${isoWeek.year}-W${padNumber(isoWeek.week)}`;
}

function formatMonthLabel(date: Date): string {
    return `${date.getUTCFullYear()}-${padNumber(date.getUTCMonth() + 1)}`;
}

function formatBucketLabel(date: Date, groupBy: ReportGroupBy): string {
    if (groupBy === "day") {
        return formatDayLabel(date);
    }

    if (groupBy === "week") {
        return formatWeekLabel(date);
    }

    return formatMonthLabel(date);
}

function isTimeSeriesGroupBy(
    groupBy: ReportGroupBy | null
): groupBy is "day" | "week" | "month" {
    return groupBy === "day" || groupBy === "week" || groupBy === "month";
}

async function getCategoryNamesMap(
    categoryIds: Types.ObjectId[]
): Promise<Map<string, string>> {
    if (categoryIds.length === 0) {
        return new Map<string, string>();
    }

    const categories = await CategoryModel.find({
        _id: {
            $in: categoryIds,
        },
    })
        .select("_id name")
        .lean<{ _id: Types.ObjectId; name: string }[]>();

    const categoriesMap = new Map<string, string>();

    for (const category of categories) {
        categoriesMap.set(category._id.toString(), category.name);
    }

    return categoriesMap;
}

function sortSeriesByLabel<T extends { label: string }>(series: T[]): T[] {
    return [...series].sort((a, b) => a.label.localeCompare(b.label));
}

function resolveCategoryBreakdownType(
    requestedType: CategoryBreakdownType | null | undefined
): CategoryBreakdownType {
    return requestedType ?? "expense";
}

export async function getReportsService(
    workspaceId: Types.ObjectId
): Promise<ReportDocument[]> {
    const reports = await ReportModel.find({
        workspaceId,
    })
        .sort({
            createdAt: -1,
        })
        .lean<ReportDocument[]>();

    return reports.map((report) => buildReportResponse(report));
}

export async function getReportByIdService(
    workspaceId: Types.ObjectId,
    reportId: Types.ObjectId
): Promise<ReportDocument | null> {
    const report = await findReportById(workspaceId, reportId);

    if (!report) {
        return null;
    }

    return buildReportResponse(report);
}

export async function createReportService(
    input: CreateReportServiceInput
): Promise<ReportDocument> {
    const { workspaceId, body } = input;

    const generatedByMemberId = parseOptionalObjectId(body.generatedByMemberId);
    const normalizedFilters = normalizeFilters(body.filters);
    const requestedGeneratedAt = parseOptionalDate(body.generatedAt);

    validateFilters(normalizedFilters);
    await validateGeneratedByMemberIfProvided(workspaceId, generatedByMemberId);

    const resolvedStatus = resolveReportStatus(body.status, requestedGeneratedAt);
    const normalizedGeneratedAt = normalizeGeneratedAtForStatus(
        resolvedStatus,
        requestedGeneratedAt
    );

    const report = await ReportModel.create({
        workspaceId,
        name: body.name.trim(),
        type: body.type,
        filters: normalizedFilters,
        generatedByMemberId,
        fileUrl: normalizeNullableString(body.fileUrl),
        filePublicId: normalizeNullableString(body.filePublicId),
        fileResourceType: normalizeReportFileResourceType(body.fileResourceType),
        fileName: normalizeNullableString(body.fileName),
        fileFormat: normalizeNullableString(body.fileFormat),
        notes: normalizeNullableString(body.notes),
        status: resolvedStatus,
        isVisible: body.isVisible ?? true,
        generatedAt: normalizedGeneratedAt,
    });

    return buildReportResponse({
        _id: report._id,
        workspaceId: report.workspaceId,
        name: report.name,
        type: report.type,
        filters: report.filters ?? null,
        generatedByMemberId: report.generatedByMemberId ?? null,
        fileUrl: report.fileUrl ?? null,
        filePublicId: report.filePublicId ?? null,
        fileResourceType: report.fileResourceType ?? null,
        fileName: report.fileName ?? null,
        fileFormat: report.fileFormat ?? null,
        notes: report.notes ?? null,
        status: report.status,
        isVisible: report.isVisible ?? true,
        generatedAt: report.generatedAt ?? null,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
    });
}

export async function updateReportService(
    input: UpdateReportServiceInput
): Promise<ReportDocument | null> {
    const { workspaceId, reportId, body } = input;

    const existingReport = await findReportById(workspaceId, reportId);

    if (!existingReport) {
        return null;
    }

    const nextGeneratedByMemberId =
        body.generatedByMemberId !== undefined
            ? parseOptionalObjectId(body.generatedByMemberId)
            : existingReport.generatedByMemberId ?? null;

    const nextFilters =
        body.filters !== undefined
            ? normalizeFilters(body.filters)
            : existingReport.filters ?? null;

    const nextGeneratedAt =
        body.generatedAt !== undefined
            ? parseOptionalDate(body.generatedAt)
            : existingReport.generatedAt ?? null;

    const nextFileUrl =
        body.fileUrl !== undefined
            ? normalizeNullableString(body.fileUrl)
            : existingReport.fileUrl ?? null;

    const nextFilePublicId =
        body.filePublicId !== undefined
            ? normalizeNullableString(body.filePublicId)
            : existingReport.filePublicId ?? null;

    const nextFileResourceType =
        body.fileResourceType !== undefined
            ? normalizeReportFileResourceType(body.fileResourceType)
            : existingReport.fileResourceType ?? null;

    const nextFileName =
        body.fileName !== undefined
            ? normalizeNullableString(body.fileName)
            : existingReport.fileName ?? null;

    const nextFileFormat =
        body.fileFormat !== undefined
            ? normalizeNullableString(body.fileFormat)
            : existingReport.fileFormat ?? null;

    validateFilters(nextFilters);
    await validateGeneratedByMemberIfProvided(workspaceId, nextGeneratedByMemberId);

    const nextStatus = resolveReportStatus(
        body.status !== undefined ? body.status : existingReport.status,
        nextGeneratedAt
    );

    const normalizedGeneratedAt = normalizeGeneratedAtForStatus(
        nextStatus,
        nextGeneratedAt
    );

    const shouldDeleteExistingCloudinaryFile =
        Boolean(existingReport.filePublicId) &&
        body.filePublicId !== undefined &&
        nextFilePublicId !== existingReport.filePublicId;

    const updatedReport = await ReportModel.findOneAndUpdate(
        {
            _id: reportId,
            workspaceId,
        },
        {
            $set: {
                name:
                    body.name !== undefined
                        ? body.name.trim()
                        : existingReport.name,
                type:
                    body.type !== undefined
                        ? body.type
                        : existingReport.type,
                filters: nextFilters,
                generatedByMemberId: nextGeneratedByMemberId,
                fileUrl: nextFileUrl,
                filePublicId: nextFilePublicId,
                fileResourceType: nextFileResourceType,
                fileName: nextFileName,
                fileFormat: nextFileFormat,
                notes:
                    body.notes !== undefined
                        ? normalizeNullableString(body.notes)
                        : existingReport.notes ?? null,
                status: nextStatus,
                isVisible:
                    body.isVisible !== undefined
                        ? body.isVisible
                        : existingReport.isVisible ?? true,
                generatedAt: normalizedGeneratedAt,
            },
        },
        {
            new: true,
        }
    ).lean<ReportDocument | null>();

    if (!updatedReport) {
        return null;
    }

    if (shouldDeleteExistingCloudinaryFile) {
        await deleteStoredReportFileIfNeeded({
            filePublicId: existingReport.filePublicId ?? null,
            fileResourceType: existingReport.fileResourceType ?? null,
        });
    }

    return buildReportResponse(updatedReport);
}

export async function deleteReportService(
    input: DeleteReportServiceInput
): Promise<ReportDocument | null> {
    const { workspaceId, reportId } = input;

    const deletedReport = await ReportModel.findOneAndDelete({
        _id: reportId,
        workspaceId,
    }).lean<ReportDocument | null>();

    if (!deletedReport) {
        return null;
    }

    await deleteStoredReportFileIfNeeded({
        filePublicId: deletedReport.filePublicId ?? null,
        fileResourceType: deletedReport.fileResourceType ?? null,
    });

    return buildReportResponse(deletedReport);
}

export async function getMonthlySummaryReportService(
    workspaceId: Types.ObjectId,
    query: ReportAnalyticsQuery
): Promise<MonthlySummaryReport> {
    const filters = normalizeAnalyticsQuery(query);
    const baseMatch = buildBaseTransactionMatch(workspaceId, filters);
    const paymentMatch = buildBasePaymentMatch(workspaceId, filters);

    const transactions = await TransactionModel.find(baseMatch)
        .select("_id type amount cashflowDirection categoryId memberId transactionDate")
        .lean<TransactionAnalyticsItem[]>();

    const completedDebtPayments = await PaymentModel.find(paymentMatch)
        .select("_id amount principalAmount feeAmount cashflowDirection paymentDate")
        .lean<PaymentAnalyticsItem[]>();

    const totals = {
        income: 0,
        expenses: 0,
        debtPayments: 0,
        debtCollections: 0,
        debtFees: 0,
        transfers: 0,
        adjustments: 0,
    };

    const counts = {
        income: 0,
        expenses: 0,
        debtPayments: 0,
        debtCollections: 0,
        transfers: 0,
        adjustments: 0,
    };

    const expenseCategoryAccumulator = new Map<
        string,
        { categoryId: Types.ObjectId | null; totalAmount: number; transactionCount: number }
    >();

    for (const transaction of transactions) {
        if (transaction.type === "income") {
            totals.income += transaction.amount;
            counts.income += 1;
        } else if (transaction.type === "expense") {
            totals.expenses += transaction.amount;
            counts.expenses += 1;

            const categoryKey = transaction.categoryId
                ? transaction.categoryId.toString()
                : "uncategorized";

            const currentValue = expenseCategoryAccumulator.get(categoryKey);

            if (currentValue) {
                currentValue.totalAmount += transaction.amount;
                currentValue.transactionCount += 1;
            } else {
                expenseCategoryAccumulator.set(categoryKey, {
                    categoryId: transaction.categoryId ?? null,
                    totalAmount: transaction.amount,
                    transactionCount: 1,
                });
            }
        } else if (transaction.type === "debt_payment") {
            if (isDebtCollectionCashflow(transaction.cashflowDirection)) {
                totals.debtCollections += transaction.amount;
                counts.debtCollections += 1;
            } else {
                totals.debtPayments += transaction.amount;
                counts.debtPayments += 1;
            }
        } else if (transaction.type === "transfer") {
            totals.transfers += transaction.amount;
            counts.transfers += 1;
        } else if (transaction.type === "adjustment") {
            totals.adjustments += getTransactionAmountForNetBalance(transaction);
            counts.adjustments += 1;
        }
    }

    for (const payment of completedDebtPayments) {
        if (!isPaymentCollection(payment)) {
            totals.debtFees += getPaymentFeeAmount(payment);
        }
    }

    const categoryIds = Array.from(expenseCategoryAccumulator.values())
        .map((item) => item.categoryId)
        .filter((categoryId): categoryId is Types.ObjectId => categoryId !== null);

    const categoryNamesMap = await getCategoryNamesMap(categoryIds);

    const topExpenseCategories: MonthlySummaryCategoryItem[] = Array.from(
        expenseCategoryAccumulator.values()
    )
        .map((item) => ({
            categoryId: item.categoryId,
            categoryName: item.categoryId
                ? categoryNamesMap.get(item.categoryId.toString()) ?? "Sin categoría"
                : "Sin categoría",
            totalAmount: roundToTwoDecimals(item.totalAmount),
            transactionCount: item.transactionCount,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);

    const seriesMap = new Map<string, MonthlySummarySeriesItem>();

    if (isTimeSeriesGroupBy(filters.groupBy)) {
        for (const transaction of transactions) {
            const label = formatBucketLabel(transaction.transactionDate, filters.groupBy);

            const currentSeries = seriesMap.get(label) ?? {
                label,
                income: 0,
                expenses: 0,
                debtPayments: 0,
                debtCollections: 0,
                debtFees: 0,
                transfers: 0,
                adjustments: 0,
                netBalance: 0,
                transactionCount: 0,
            };

            if (transaction.type === "income") {
                currentSeries.income += transaction.amount;
            } else if (transaction.type === "expense") {
                currentSeries.expenses += transaction.amount;
            } else if (transaction.type === "debt_payment") {
                if (isDebtCollectionCashflow(transaction.cashflowDirection)) {
                    currentSeries.debtCollections += transaction.amount;
                } else {
                    currentSeries.debtPayments += transaction.amount;
                }
            } else if (transaction.type === "transfer") {
                currentSeries.transfers += transaction.amount;
            } else if (transaction.type === "adjustment") {
                currentSeries.adjustments += getTransactionAmountForNetBalance(transaction);
            }

            currentSeries.transactionCount += 1;
            currentSeries.netBalance =
                currentSeries.income +
                currentSeries.debtCollections -
                currentSeries.expenses -
                currentSeries.debtPayments +
                currentSeries.adjustments;

            seriesMap.set(label, currentSeries);
        }

        for (const payment of completedDebtPayments) {
            if (isPaymentCollection(payment)) {
                continue;
            }

            const label = formatBucketLabel(payment.paymentDate, filters.groupBy);
            const currentSeries = seriesMap.get(label) ?? {
                label,
                income: 0,
                expenses: 0,
                debtPayments: 0,
                debtCollections: 0,
                debtFees: 0,
                transfers: 0,
                adjustments: 0,
                netBalance: 0,
                transactionCount: 0,
            };

            currentSeries.debtFees += getPaymentFeeAmount(payment);
            seriesMap.set(label, currentSeries);
        }
    }

    return {
        filters: query,
        totals: {
            income: roundToTwoDecimals(totals.income),
            expenses: roundToTwoDecimals(totals.expenses),
            debtPayments: roundToTwoDecimals(totals.debtPayments),
            debtCollections: roundToTwoDecimals(totals.debtCollections),
            debtFees: roundToTwoDecimals(totals.debtFees),
            transfers: roundToTwoDecimals(totals.transfers),
            adjustments: roundToTwoDecimals(totals.adjustments),
            netBalance: roundToTwoDecimals(
                totals.income +
                totals.debtCollections -
                totals.expenses -
                totals.debtPayments +
                totals.adjustments
            ),
        },
        counts: {
            income: counts.income,
            expenses: counts.expenses,
            debtPayments: counts.debtPayments,
            debtCollections: counts.debtCollections,
            transfers: counts.transfers,
            adjustments: counts.adjustments,
            total:
                counts.income +
                counts.expenses +
                counts.debtPayments +
                counts.debtCollections +
                counts.transfers +
                counts.adjustments,
        },
        topExpenseCategories,
        series: sortSeriesByLabel(
            Array.from(seriesMap.values()).map((item) => ({
                ...item,
                income: roundToTwoDecimals(item.income),
                expenses: roundToTwoDecimals(item.expenses),
                debtPayments: roundToTwoDecimals(item.debtPayments),
                debtCollections: roundToTwoDecimals(item.debtCollections),
                debtFees: roundToTwoDecimals(item.debtFees),
                transfers: roundToTwoDecimals(item.transfers),
                adjustments: roundToTwoDecimals(item.adjustments),
                netBalance: roundToTwoDecimals(item.netBalance),
            }))
        ),
    };
}

export async function getCategoryBreakdownReportService(
    workspaceId: Types.ObjectId,
    query: ReportAnalyticsQuery
): Promise<CategoryBreakdownReport> {
    const filters = normalizeAnalyticsQuery(query);
    const breakdownType = resolveCategoryBreakdownType(filters.type);
    const baseMatch = buildBaseTransactionMatch(workspaceId, filters);
    const transactionTypes =
        breakdownType === "all" ? ["expense", "income", "adjustment"] : [breakdownType];

    const transactions = await TransactionModel.find({
        ...baseMatch,
        type: {
            $in: transactionTypes,
        },
    })
        .select("_id amount categoryId transactionDate")
        .lean<Pick<TransactionAnalyticsItem, "_id" | "amount" | "categoryId" | "transactionDate">[]>();

    const categoryAccumulator = new Map<
        string,
        { categoryId: Types.ObjectId | null; totalAmount: number; transactionCount: number }
    >();

    for (const transaction of transactions) {
        const categoryKey = transaction.categoryId
            ? transaction.categoryId.toString()
            : "uncategorized";

        const currentValue = categoryAccumulator.get(categoryKey);

        if (currentValue) {
            currentValue.totalAmount += transaction.amount;
            currentValue.transactionCount += 1;
        } else {
            categoryAccumulator.set(categoryKey, {
                categoryId: transaction.categoryId ?? null,
                totalAmount: transaction.amount,
                transactionCount: 1,
            });
        }
    }

    const categoryIds = Array.from(categoryAccumulator.values())
        .map((item) => item.categoryId)
        .filter((categoryId): categoryId is Types.ObjectId => categoryId !== null);

    const categoryNamesMap = await getCategoryNamesMap(categoryIds);

    const totalAmount = roundToTwoDecimals(
        Array.from(categoryAccumulator.values()).reduce(
            (sum, item) => sum + item.totalAmount,
            0
        )
    );

    const totalTransactions = Array.from(categoryAccumulator.values()).reduce(
        (sum, item) => sum + item.transactionCount,
        0
    );

    const categories: CategoryBreakdownItem[] = Array.from(categoryAccumulator.values())
        .map((item) => ({
            categoryId: item.categoryId,
            categoryName: item.categoryId
                ? categoryNamesMap.get(item.categoryId.toString()) ?? "Sin categoría"
                : "Sin categoría",
            totalAmount: roundToTwoDecimals(item.totalAmount),
            transactionCount: item.transactionCount,
            percentageOfTotal:
                totalAmount > 0
                    ? roundToTwoDecimals((item.totalAmount / totalAmount) * 100)
                    : 0,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

    const seriesMap = new Map<string, CategoryBreakdownSeriesItem>();

    if (isTimeSeriesGroupBy(filters.groupBy)) {
        for (const transaction of transactions) {
            const label = formatBucketLabel(transaction.transactionDate, filters.groupBy);

            const currentSeries = seriesMap.get(label) ?? {
                label,
                totalAmount: 0,
                transactionCount: 0,
            };

            currentSeries.totalAmount += transaction.amount;
            currentSeries.transactionCount += 1;

            seriesMap.set(label, currentSeries);
        }
    }

    return {
        filters: query,
        type: breakdownType,
        totalAmount,
        totalTransactions,
        categories,
        series: sortSeriesByLabel(
            Array.from(seriesMap.values()).map((item) => ({
                label: item.label,
                totalAmount: roundToTwoDecimals(item.totalAmount),
                transactionCount: item.transactionCount,
            }))
        ),
    };
}

export async function getDebtSummaryReportService(
    workspaceId: Types.ObjectId,
    query: ReportAnalyticsQuery
): Promise<DebtSummaryReport> {
    const filters = normalizeAnalyticsQuery(query);
    const snapshotAsOf = filters.dateTo ?? new Date();

    const currentDebtMatch: {
        workspaceId: Types.ObjectId;
        currency?: CurrencyCode;
        memberId?: Types.ObjectId;
        relatedAccountId?: Types.ObjectId;
        status: { $in: Array<"active" | "overdue"> };
        startDate: { $lte: Date };
    } = {
        workspaceId,
        status: { $in: ["active", "overdue"] },
        startDate: { $lte: snapshotAsOf },
    };

    const createdDebtMatch: {
        workspaceId: Types.ObjectId;
        currency?: CurrencyCode;
        memberId?: Types.ObjectId;
        relatedAccountId?: Types.ObjectId;
        startDate?: {
            $gte?: Date;
            $lte?: Date;
        };
    } = {
        workspaceId,
    };

    if (filters.currency) {
        currentDebtMatch.currency = filters.currency;
        createdDebtMatch.currency = filters.currency;
    }

    if (filters.memberId) {
        currentDebtMatch.memberId = filters.memberId;
        createdDebtMatch.memberId = filters.memberId;
    }

    if (filters.accountId) {
        currentDebtMatch.relatedAccountId = filters.accountId;
        createdDebtMatch.relatedAccountId = filters.accountId;
    }

    if (filters.dateFrom || filters.dateTo) {
        createdDebtMatch.startDate = {};

        if (filters.dateFrom) {
            createdDebtMatch.startDate.$gte = filters.dateFrom;
        }

        if (filters.dateTo) {
            createdDebtMatch.startDate.$lte = filters.dateTo;
        }
    }

    const currentDebts = await DebtModel.find(currentDebtMatch)
        .select("_id type originalAmount remainingAmount status startDate")
        .lean<DebtAnalyticsItem[]>();

    const createdDebts = await DebtModel.find(createdDebtMatch)
        .select("_id type originalAmount remainingAmount status startDate")
        .lean<DebtAnalyticsItem[]>();

    const paymentMatch = buildBasePaymentMatch(workspaceId, filters);

    const payments = await PaymentModel.find(paymentMatch)
        .select("_id amount principalAmount feeAmount cashflowDirection paymentDate")
        .lean<PaymentAnalyticsItem[]>();

    const counts = {
        total: currentDebts.length,
        active: currentDebts.filter((debt) => debt.status === "active").length,
        paid: currentDebts.filter((debt) => debt.status === "paid").length,
        overdue: currentDebts.filter((debt) => debt.status === "overdue").length,
        cancelled: currentDebts.filter((debt) => debt.status === "cancelled").length,
    };

    const direction = {
        owedByMeCount: currentDebts.filter((debt) => debt.type === "owed_by_me").length,
        owedToMeCount: currentDebts.filter((debt) => debt.type === "owed_to_me").length,
        owedByMeOriginalAmount: roundToTwoDecimals(
            currentDebts
                .filter((debt) => debt.type === "owed_by_me")
                .reduce((sum, debt) => sum + debt.originalAmount, 0)
        ),
        owedToMeOriginalAmount: roundToTwoDecimals(
            currentDebts
                .filter((debt) => debt.type === "owed_to_me")
                .reduce((sum, debt) => sum + debt.originalAmount, 0)
        ),
        owedByMeRemainingAmount: roundToTwoDecimals(
            currentDebts
                .filter((debt) => debt.type === "owed_by_me")
                .reduce((sum, debt) => sum + debt.remainingAmount, 0)
        ),
        owedToMeRemainingAmount: roundToTwoDecimals(
            currentDebts
                .filter((debt) => debt.type === "owed_to_me")
                .reduce((sum, debt) => sum + debt.remainingAmount, 0)
        ),
    };

    const totalOriginalAmount = roundToTwoDecimals(
        currentDebts.reduce((sum, debt) => sum + debt.originalAmount, 0)
    );
    const totalRemainingAmount = roundToTwoDecimals(
        currentDebts.reduce((sum, debt) => sum + debt.remainingAmount, 0)
    );

    let debtPayments = 0;
    let debtCollections = 0;
    let principalPaid = 0;
    let principalCollected = 0;
    let debtFees = 0;
    let completedPaymentsTotal = 0;

    for (const payment of payments) {
        const principalAmount = getPaymentPrincipalAmount(payment);
        const feeAmount = getPaymentFeeAmount(payment);

        completedPaymentsTotal += payment.amount;

        if (isPaymentCollection(payment)) {
            debtCollections += payment.amount;
            principalCollected += principalAmount;
        } else {
            debtPayments += payment.amount;
            principalPaid += principalAmount;
            debtFees += feeAmount;
        }
    }

    const periodActivity = {
        paymentsCount: payments.length,
        debtPayments: roundToTwoDecimals(debtPayments),
        debtCollections: roundToTwoDecimals(debtCollections),
        principalPaid: roundToTwoDecimals(principalPaid),
        principalCollected: roundToTwoDecimals(principalCollected),
        debtFees: roundToTwoDecimals(debtFees),
        completedPaymentsTotal: roundToTwoDecimals(completedPaymentsTotal),
        netCashflow: roundToTwoDecimals(debtCollections - debtPayments),
    };

    const currentOutstandingSnapshot = {
        asOf: snapshotAsOf,
        counts,
        direction,
        totalOriginalAmount,
        totalRemainingAmount,
    };

    const seriesMap = new Map<
        string,
        {
            label: string;
            createdDebtAmount: number;
            paidAmount: number;
            collectedAmount: number;
            feeAmount: number;
            principalActivityAmount: number;
        }
    >();

    if (isTimeSeriesGroupBy(filters.groupBy)) {
        for (const debt of createdDebts) {
            const label = formatBucketLabel(debt.startDate, filters.groupBy);
            const currentValue = seriesMap.get(label) ?? {
                label,
                createdDebtAmount: 0,
                paidAmount: 0,
                collectedAmount: 0,
                feeAmount: 0,
                principalActivityAmount: 0,
            };

            currentValue.createdDebtAmount += debt.originalAmount;
            seriesMap.set(label, currentValue);
        }

        for (const payment of payments) {
            const label = formatBucketLabel(payment.paymentDate, filters.groupBy);
            const currentValue = seriesMap.get(label) ?? {
                label,
                createdDebtAmount: 0,
                paidAmount: 0,
                collectedAmount: 0,
                feeAmount: 0,
                principalActivityAmount: 0,
            };

            if (isPaymentCollection(payment)) {
                currentValue.collectedAmount += payment.amount;
                currentValue.principalActivityAmount += getPaymentPrincipalAmount(payment);
            } else {
                currentValue.paidAmount += payment.amount;
                currentValue.feeAmount += getPaymentFeeAmount(payment);
                currentValue.principalActivityAmount += getPaymentPrincipalAmount(payment);
            }

            seriesMap.set(label, currentValue);
        }
    }

    const sortedSeriesLabels = sortSeriesByLabel(Array.from(seriesMap.values()));

    let runningBalance = 0;

    const series: DebtSummarySeriesItem[] = sortedSeriesLabels.map((item) => {
        runningBalance += item.createdDebtAmount - item.principalActivityAmount;

        return {
            label: item.label,
            createdDebtAmount: roundToTwoDecimals(item.createdDebtAmount),
            paidAmount: roundToTwoDecimals(item.paidAmount),
            collectedAmount: roundToTwoDecimals(item.collectedAmount),
            feeAmount: roundToTwoDecimals(item.feeAmount),
            remainingAmount: roundToTwoDecimals(Math.max(0, runningBalance)),
        };
    });

    return {
        filters: query,
        counts,
        direction,
        totalOriginalAmount,
        totalRemainingAmount,
        completedPaymentsTotal: periodActivity.completedPaymentsTotal,
        currentOutstandingSnapshot,
        periodActivity,
        series,
    };
}

function resolveComputedBudgetStatus(
    budget: BudgetDocument,
    isExceeded: boolean
): BudgetStatus {
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

async function computeBudgetSummaryItem(
    budget: BudgetDocument,
    includeArchivedTransactions: boolean
): Promise<BudgetSummaryItem> {
    const transactionMatch: BaseTransactionMatch = {
        workspaceId: budget.workspaceId,
        type: "expense",
        status: "posted",
        isActive: true,
    };

    if (!includeArchivedTransactions) {
        transactionMatch.isArchived = false;
    }

    transactionMatch.transactionDate = {
        $gte: budget.startDate,
        $lte: budget.endDate,
    };

    transactionMatch.currency = budget.currency;

    if (budget.categoryId) {
        transactionMatch.categoryId = budget.categoryId;
    }

    if (budget.memberId) {
        transactionMatch.memberId = budget.memberId;
    }

    const matchedTransactions = await TransactionModel.find(transactionMatch)
        .select("_id amount")
        .lean<{ _id: Types.ObjectId; amount: number }[]>();

    const spentAmount = roundToTwoDecimals(
        matchedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
    );

    const matchedTransactionCount = matchedTransactions.length;
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

    return {
        budgetId: budget._id,
        name: budget.name,
        currency: budget.currency,
        limitAmount: budget.limitAmount,
        spentAmount,
        remainingAmount,
        usagePercent,
        hasReachedAlert,
        isExceeded,
        matchedTransactionCount,
        computedStatus: resolveComputedBudgetStatus(budget, isExceeded),
        startDate: budget.startDate,
        endDate: budget.endDate,
        categoryId: budget.categoryId ?? null,
        memberId: budget.memberId ?? null,
    };
}

export async function getBudgetSummaryReportService(
    workspaceId: Types.ObjectId,
    query: ReportAnalyticsQuery
): Promise<BudgetSummaryReport> {
    const filters = normalizeAnalyticsQuery(query);

    const budgetMatch: {
        workspaceId: Types.ObjectId;
        currency?: CurrencyCode;
        memberId?: Types.ObjectId;
        categoryId?: Types.ObjectId;
        startDate?: {
            $lte: Date;
        };
        endDate?: {
            $gte: Date;
        };
    } = {
        workspaceId,
    };

    if (filters.currency) {
        budgetMatch.currency = filters.currency;
    }

    if (filters.memberId) {
        budgetMatch.memberId = filters.memberId;
    }

    if (filters.categoryId) {
        budgetMatch.categoryId = filters.categoryId;
    }

    if (filters.dateTo) {
        budgetMatch.startDate = {
            $lte: filters.dateTo,
        };
    }

    if (filters.dateFrom) {
        budgetMatch.endDate = {
            $gte: filters.dateFrom,
        };
    }

    const budgets = await BudgetModel.find(budgetMatch).lean<BudgetDocument[]>();

    const budgetItems = await Promise.all(
        budgets.map((budget) =>
            computeBudgetSummaryItem(budget, filters.includeArchived)
        )
    );

    const seriesMap = new Map<string, BudgetSummarySeriesItem>();

    if (isTimeSeriesGroupBy(filters.groupBy)) {
        for (const budget of budgetItems) {
            const labelsForBudget = new Set<string>();

            if (filters.groupBy === "day") {
                let currentDate = getUtcDateStart(budget.startDate);
                const endDate = getUtcDateStart(budget.endDate);

                while (currentDate.getTime() <= endDate.getTime()) {
                    labelsForBudget.add(formatDayLabel(currentDate));
                    currentDate = new Date(currentDate.getTime() + 86400000);
                }
            } else if (filters.groupBy === "week") {
                let currentDate = getUtcDateStart(budget.startDate);
                const endDate = getUtcDateStart(budget.endDate);

                while (currentDate.getTime() <= endDate.getTime()) {
                    labelsForBudget.add(formatWeekLabel(currentDate));
                    currentDate = new Date(currentDate.getTime() + 86400000);
                }
            } else {
                let currentDate = new Date(
                    Date.UTC(
                        budget.startDate.getUTCFullYear(),
                        budget.startDate.getUTCMonth(),
                        1
                    )
                );

                const endDate = new Date(
                    Date.UTC(
                        budget.endDate.getUTCFullYear(),
                        budget.endDate.getUTCMonth(),
                        1
                    )
                );

                while (currentDate.getTime() <= endDate.getTime()) {
                    labelsForBudget.add(formatMonthLabel(currentDate));
                    currentDate = new Date(
                        Date.UTC(
                            currentDate.getUTCFullYear(),
                            currentDate.getUTCMonth() + 1,
                            1
                        )
                    );
                }
            }

            const budgetTransactionMatch: BaseTransactionMatch = {
                workspaceId,
                type: "expense",
                status: "posted",
                isActive: true,
            };

            if (!filters.includeArchived) {
                budgetTransactionMatch.isArchived = false;
            }

            budgetTransactionMatch.transactionDate = {
                $gte: budget.startDate,
                $lte: budget.endDate,
            };

            budgetTransactionMatch.currency = budget.currency;

            if (budget.categoryId) {
                budgetTransactionMatch.categoryId = budget.categoryId;
            }

            if (budget.memberId) {
                budgetTransactionMatch.memberId = budget.memberId;
            }

            const budgetTransactions = await TransactionModel.find(budgetTransactionMatch)
                .select("_id amount transactionDate")
                .lean<{ _id: Types.ObjectId; amount: number; transactionDate: Date }[]>();

            for (const label of labelsForBudget) {
                const currentSeries = seriesMap.get(label) ?? {
                    label,
                    totalLimitAmount: 0,
                    totalSpentAmount: 0,
                    totalRemainingAmount: 0,
                };

                currentSeries.totalLimitAmount += budget.limitAmount;

                const spentForBucket = budgetTransactions
                    .filter((transaction) =>
                        formatBucketLabel(transaction.transactionDate, filters.groupBy) === label
                    )
                    .reduce((sum, transaction) => sum + transaction.amount, 0);

                currentSeries.totalSpentAmount += spentForBucket;
                currentSeries.totalRemainingAmount += Math.max(
                    0,
                    budget.limitAmount - spentForBucket
                );

                seriesMap.set(label, currentSeries);
            }
        }
    }

    return {
        filters: query,
        totals: {
            budgetCount: budgetItems.length,
            totalLimitAmount: roundToTwoDecimals(
                budgetItems.reduce((sum, item) => sum + item.limitAmount, 0)
            ),
            totalSpentAmount: roundToTwoDecimals(
                budgetItems.reduce((sum, item) => sum + item.spentAmount, 0)
            ),
            totalRemainingAmount: roundToTwoDecimals(
                budgetItems.reduce((sum, item) => sum + item.remainingAmount, 0)
            ),
            exceededCount: budgetItems.filter((item) => item.isExceeded).length,
            alertReachedCount: budgetItems.filter((item) => item.hasReachedAlert).length,
        },
        budgets: budgetItems.sort((a, b) => b.usagePercent - a.usagePercent),
        series: sortSeriesByLabel(
            Array.from(seriesMap.values()).map((item) => ({
                label: item.label,
                totalLimitAmount: roundToTwoDecimals(item.totalLimitAmount),
                totalSpentAmount: roundToTwoDecimals(item.totalSpentAmount),
                totalRemainingAmount: roundToTwoDecimals(item.totalRemainingAmount),
            }))
        ),
    };
}