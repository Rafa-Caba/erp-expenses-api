// src/reports/services/reportExports.service.ts

import fs from "node:fs/promises";
import path from "node:path";
import { Types } from "mongoose";

import { deleteFromCloudinary, uploadExportedFile } from "@/src/middlewares/cloudinaryUploads";
import {
    createReportService,
    getBudgetSummaryReportService,
    getCategoryBreakdownReportService,
    getDebtSummaryReportService,
    getMonthlySummaryReportService,
} from "./reports.service";
import type {
    BudgetSummaryReport,
    CategoryBreakdownReport,
    CreateReportBody,
    DebtSummaryReport,
    MonthlySummaryReport,
    ReportDocument,
    ReportFileResourceType,
} from "../types/reports.types";
import type {
    ExportBudgetSummaryServiceInput,
    ExportCategoryBreakdownServiceInput,
    ExportDebtSummaryServiceInput,
    ExportMonthlySummaryServiceInput,
    ExportReportFileResult,
    ExportReportResponse,
    ExportReportServiceInput,
    LocalGeneratedExportFile,
    ReportExportFormat,
} from "../types/reportExports.types";
import { ReportServiceError } from "./reports.service";
import { buildCsvFromRows } from "../services/exporters/exportCsv.service";
import { buildXlsxBufferFromRows } from "../services/exporters/exportXlsx.service";

const EXPORT_BASE_DIR = path.resolve(process.cwd(), "storage", "reports-exports");

type ExportRows = Array<Record<string, string | number | boolean | null | undefined>>;

function parseOptionalObjectId(value: string | null | undefined): Types.ObjectId | null {
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

function sanitizeFileName(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}

function getTimestampFilePart(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hour = String(date.getUTCHours()).padStart(2, "0");
    const minute = String(date.getUTCMinutes()).padStart(2, "0");
    const second = String(date.getUTCSeconds()).padStart(2, "0");

    return `${year}${month}${day}-${hour}${minute}${second}`;
}

async function ensureExportDirectory(): Promise<void> {
    await fs.mkdir(EXPORT_BASE_DIR, { recursive: true });
}

async function writeCsvFile(
    fileName: string,
    headers: string[],
    rows: ExportRows
): Promise<LocalGeneratedExportFile> {
    await ensureExportDirectory();

    const absolutePath = path.join(EXPORT_BASE_DIR, fileName);
    const csvContent = buildCsvFromRows(headers, rows);

    await fs.writeFile(absolutePath, csvContent, "utf8");

    return {
        absolutePath,
        fileName,
        format: "csv",
    };
}

async function writeXlsxFile(
    fileName: string,
    sheetName: string,
    headers: string[],
    rows: ExportRows
): Promise<LocalGeneratedExportFile> {
    await ensureExportDirectory();

    const absolutePath = path.join(EXPORT_BASE_DIR, fileName);
    const fileBuffer = await buildXlsxBufferFromRows(sheetName, headers, rows);

    await fs.writeFile(absolutePath, fileBuffer);

    return {
        absolutePath,
        fileName,
        format: "xlsx",
    };
}

async function uploadGeneratedExportFile(
    localFile: LocalGeneratedExportFile
): Promise<ExportReportFileResult> {
    try {
        const uploadedFile = await uploadExportedFile({
            filePath: localFile.absolutePath,
            fileName: localFile.fileName,
            folder: "erp-expenses/reports-exports",
            resourceType: "raw",
            allowedFormats: ["csv", "xlsx"],
        });

        return {
            format: localFile.format,
            fileName: uploadedFile.fileName,
            fileUrl: uploadedFile.fileUrl,
            filePublicId: uploadedFile.filePublicId,
            fileResourceType: uploadedFile.fileResourceType as ReportFileResourceType,
            fileFormat: uploadedFile.fileFormat,
            fileBytes: uploadedFile.fileBytes,
        };
    } finally {
        await fs.rm(localFile.absolutePath, { force: true });
    }
}

async function persistGeneratedReport(args: {
    workspaceId: Types.ObjectId;
    body: ExportReportServiceInput["body"];
    type: CreateReportBody["type"];
    generatedByMemberId: Types.ObjectId | null;
    fileUrl: string;
    filePublicId: string;
    fileResourceType: ReportFileResourceType;
    fileName: string;
    fileFormat: string | null;
    generatedAt: Date;
    workspace: ExportReportServiceInput["workspace"];
}): Promise<ReportDocument> {
    return createReportService({
        workspaceId: args.workspaceId,
        workspace: args.workspace,
        body: {
            name: args.body.name,
            type: args.type,
            filters: args.body.filters ?? null,
            generatedByMemberId: args.generatedByMemberId
                ? args.generatedByMemberId.toString()
                : null,
            fileUrl: args.fileUrl,
            filePublicId: args.filePublicId,
            fileResourceType: args.fileResourceType,
            fileName: args.fileName,
            fileFormat: args.fileFormat,
            notes: args.body.notes ?? null,
            status: "generated",
            isVisible: true,
            generatedAt: args.generatedAt.toISOString(),
        },
    });
}

function buildMonthlySummaryExportRows(summary: MonthlySummaryReport): {
    headers: string[];
    rows: ExportRows;
} {
    const rows: ExportRows = [
        {
            section: "totals",
            label: "income",
            value: summary.totals.income,
        },
        {
            section: "totals",
            label: "expenses",
            value: summary.totals.expenses,
        },
        {
            section: "totals",
            label: "debtPayments",
            value: summary.totals.debtPayments,
        },
        {
            section: "totals",
            label: "transfers",
            value: summary.totals.transfers,
        },
        {
            section: "totals",
            label: "adjustments",
            value: summary.totals.adjustments,
        },
        {
            section: "totals",
            label: "netBalance",
            value: summary.totals.netBalance,
        },
        {
            section: "counts",
            label: "income",
            value: summary.counts.income,
        },
        {
            section: "counts",
            label: "expenses",
            value: summary.counts.expenses,
        },
        {
            section: "counts",
            label: "debtPayments",
            value: summary.counts.debtPayments,
        },
        {
            section: "counts",
            label: "transfers",
            value: summary.counts.transfers,
        },
        {
            section: "counts",
            label: "adjustments",
            value: summary.counts.adjustments,
        },
        {
            section: "counts",
            label: "total",
            value: summary.counts.total,
        },
        ...summary.topExpenseCategories.map((item) => ({
            section: "topExpenseCategories",
            label: item.categoryName,
            categoryId: item.categoryId?.toString() ?? null,
            totalAmount: item.totalAmount,
            transactionCount: item.transactionCount,
        })),
        ...summary.series.map((item) => ({
            section: "series",
            label: item.label,
            income: item.income,
            expenses: item.expenses,
            debtPayments: item.debtPayments,
            transfers: item.transfers,
            adjustments: item.adjustments,
            netBalance: item.netBalance,
            transactionCount: item.transactionCount,
        })),
    ];

    return {
        headers: [
            "section",
            "label",
            "value",
            "categoryId",
            "totalAmount",
            "transactionCount",
            "income",
            "expenses",
            "debtPayments",
            "transfers",
            "adjustments",
            "netBalance",
        ],
        rows,
    };
}

function buildCategoryBreakdownExportRows(breakdown: CategoryBreakdownReport): {
    headers: string[];
    rows: ExportRows;
} {
    const rows: ExportRows = [
        {
            section: "summary",
            label: "totalAmount",
            value: breakdown.totalAmount,
        },
        {
            section: "summary",
            label: "totalTransactions",
            value: breakdown.totalTransactions,
        },
        ...breakdown.categories.map((item) => ({
            section: "categories",
            label: item.categoryName,
            categoryId: item.categoryId?.toString() ?? null,
            totalAmount: item.totalAmount,
            transactionCount: item.transactionCount,
            percentageOfTotal: item.percentageOfTotal,
        })),
        ...breakdown.series.map((item) => ({
            section: "series",
            label: item.label,
            totalAmount: item.totalAmount,
            transactionCount: item.transactionCount,
        })),
    ];

    return {
        headers: [
            "section",
            "label",
            "value",
            "categoryId",
            "totalAmount",
            "transactionCount",
            "percentageOfTotal",
        ],
        rows,
    };
}

function buildDebtSummaryExportRows(summary: DebtSummaryReport): {
    headers: string[];
    rows: ExportRows;
} {
    const rows: ExportRows = [
        {
            section: "counts",
            label: "total",
            value: summary.counts.total,
        },
        {
            section: "counts",
            label: "active",
            value: summary.counts.active,
        },
        {
            section: "counts",
            label: "paid",
            value: summary.counts.paid,
        },
        {
            section: "counts",
            label: "overdue",
            value: summary.counts.overdue,
        },
        {
            section: "counts",
            label: "cancelled",
            value: summary.counts.cancelled,
        },
        {
            section: "direction",
            label: "owedByMeCount",
            value: summary.direction.owedByMeCount,
        },
        {
            section: "direction",
            label: "owedToMeCount",
            value: summary.direction.owedToMeCount,
        },
        {
            section: "direction",
            label: "owedByMeOriginalAmount",
            value: summary.direction.owedByMeOriginalAmount,
        },
        {
            section: "direction",
            label: "owedToMeOriginalAmount",
            value: summary.direction.owedToMeOriginalAmount,
        },
        {
            section: "direction",
            label: "owedByMeRemainingAmount",
            value: summary.direction.owedByMeRemainingAmount,
        },
        {
            section: "direction",
            label: "owedToMeRemainingAmount",
            value: summary.direction.owedToMeRemainingAmount,
        },
        {
            section: "totals",
            label: "totalOriginalAmount",
            value: summary.totalOriginalAmount,
        },
        {
            section: "totals",
            label: "totalRemainingAmount",
            value: summary.totalRemainingAmount,
        },
        {
            section: "totals",
            label: "completedPaymentsTotal",
            value: summary.completedPaymentsTotal,
        },
        ...summary.series.map((item) => ({
            section: "series",
            label: item.label,
            createdDebtAmount: item.createdDebtAmount,
            paidAmount: item.paidAmount,
            remainingAmount: item.remainingAmount,
        })),
    ];

    return {
        headers: [
            "section",
            "label",
            "value",
            "createdDebtAmount",
            "paidAmount",
            "remainingAmount",
        ],
        rows,
    };
}

function buildBudgetSummaryExportRows(summary: BudgetSummaryReport): {
    headers: string[];
    rows: ExportRows;
} {
    const rows: ExportRows = [
        {
            section: "totals",
            label: "budgetCount",
            value: summary.totals.budgetCount,
        },
        {
            section: "totals",
            label: "totalLimitAmount",
            value: summary.totals.totalLimitAmount,
        },
        {
            section: "totals",
            label: "totalSpentAmount",
            value: summary.totals.totalSpentAmount,
        },
        {
            section: "totals",
            label: "totalRemainingAmount",
            value: summary.totals.totalRemainingAmount,
        },
        {
            section: "totals",
            label: "exceededCount",
            value: summary.totals.exceededCount,
        },
        {
            section: "totals",
            label: "alertReachedCount",
            value: summary.totals.alertReachedCount,
        },
        ...summary.budgets.map((item) => ({
            section: "budgets",
            label: item.name,
            budgetId: item.budgetId.toString(),
            currency: item.currency,
            limitAmount: item.limitAmount,
            spentAmount: item.spentAmount,
            remainingAmount: item.remainingAmount,
            usagePercent: item.usagePercent,
            hasReachedAlert: item.hasReachedAlert,
            isExceeded: item.isExceeded,
            matchedTransactionCount: item.matchedTransactionCount,
            computedStatus: item.computedStatus,
            startDate: item.startDate.toISOString(),
            endDate: item.endDate.toISOString(),
            categoryId: item.categoryId?.toString() ?? null,
            memberId: item.memberId?.toString() ?? null,
        })),
        ...summary.series.map((item) => ({
            section: "series",
            label: item.label,
            totalLimitAmount: item.totalLimitAmount,
            totalSpentAmount: item.totalSpentAmount,
            totalRemainingAmount: item.totalRemainingAmount,
        })),
    ];

    return {
        headers: [
            "section",
            "label",
            "value",
            "budgetId",
            "currency",
            "limitAmount",
            "spentAmount",
            "remainingAmount",
            "usagePercent",
            "hasReachedAlert",
            "isExceeded",
            "matchedTransactionCount",
            "computedStatus",
            "startDate",
            "endDate",
            "categoryId",
            "memberId",
            "totalLimitAmount",
            "totalSpentAmount",
            "totalRemainingAmount",
        ],
        rows,
    };
}

async function writeExportFile(args: {
    exportFormat: ReportExportFormat;
    baseFileName: string;
    sheetName: string;
    headers: string[];
    rows: ExportRows;
}): Promise<LocalGeneratedExportFile> {
    if (args.exportFormat === "csv") {
        return writeCsvFile(`${args.baseFileName}.csv`, args.headers, args.rows);
    }

    return writeXlsxFile(`${args.baseFileName}.xlsx`, args.sheetName, args.headers, args.rows);
}

export async function exportMonthlySummaryService(
    input: ExportMonthlySummaryServiceInput
): Promise<ExportReportResponse> {
    const summary = await getMonthlySummaryReportService(
        input.workspaceId,
        input.body.filters ?? {}
    );

    const { headers, rows } = buildMonthlySummaryExportRows(summary);
    const now = new Date();
    const baseFileName = `${sanitizeFileName(input.body.name)}-${getTimestampFilePart(now)}`;

    const localFile = await writeExportFile({
        exportFormat: input.body.exportFormat,
        baseFileName,
        sheetName: "Monthly Summary",
        headers,
        rows,
    });

    const file = await uploadGeneratedExportFile(localFile);

    const generatedByMemberId = parseOptionalObjectId(input.body.generatedByMemberId);
    const persistReport = input.body.persistReport ?? true;

    try {
        const report = persistReport
            ? await persistGeneratedReport({
                workspaceId: input.workspaceId,
                body: input.body,
                type: input.reportType,
                generatedByMemberId,
                fileUrl: file.fileUrl,
                filePublicId: file.filePublicId,
                fileResourceType: file.fileResourceType,
                fileName: file.fileName,
                fileFormat: file.fileFormat,
                generatedAt: now,
                workspace: input.workspace,
            })
            : null;

        return {
            report,
            file,
        };
    } catch (error) {
        await deleteFromCloudinary(file.filePublicId, file.fileResourceType);
        throw error;
    }
}

export async function exportCategoryBreakdownService(
    input: ExportCategoryBreakdownServiceInput
): Promise<ExportReportResponse> {
    const breakdown = await getCategoryBreakdownReportService(
        input.workspaceId,
        input.body.filters ?? {}
    );

    const { headers, rows } = buildCategoryBreakdownExportRows(breakdown);
    const now = new Date();
    const baseFileName = `${sanitizeFileName(input.body.name)}-${getTimestampFilePart(now)}`;

    const localFile = await writeExportFile({
        exportFormat: input.body.exportFormat,
        baseFileName,
        sheetName: "Category Breakdown",
        headers,
        rows,
    });

    const file = await uploadGeneratedExportFile(localFile);

    const generatedByMemberId = parseOptionalObjectId(input.body.generatedByMemberId);
    const persistReport = input.body.persistReport ?? true;

    try {
        const report = persistReport
            ? await persistGeneratedReport({
                workspaceId: input.workspaceId,
                body: input.body,
                type: input.reportType,
                generatedByMemberId,
                fileUrl: file.fileUrl,
                filePublicId: file.filePublicId,
                fileResourceType: file.fileResourceType,
                fileName: file.fileName,
                fileFormat: file.fileFormat,
                generatedAt: now,
                workspace: input.workspace,
            })
            : null;

        return {
            report,
            file,
        };
    } catch (error) {
        await deleteFromCloudinary(file.filePublicId, file.fileResourceType);
        throw error;
    }
}

export async function exportDebtSummaryService(
    input: ExportDebtSummaryServiceInput
): Promise<ExportReportResponse> {
    const summary = await getDebtSummaryReportService(
        input.workspaceId,
        input.body.filters ?? {}
    );

    const { headers, rows } = buildDebtSummaryExportRows(summary);
    const now = new Date();
    const baseFileName = `${sanitizeFileName(input.body.name)}-${getTimestampFilePart(now)}`;

    const localFile = await writeExportFile({
        exportFormat: input.body.exportFormat,
        baseFileName,
        sheetName: "Debt Summary",
        headers,
        rows,
    });

    const file = await uploadGeneratedExportFile(localFile);

    const generatedByMemberId = parseOptionalObjectId(input.body.generatedByMemberId);
    const persistReport = input.body.persistReport ?? true;

    try {
        const report = persistReport
            ? await persistGeneratedReport({
                workspaceId: input.workspaceId,
                body: input.body,
                type: input.reportType,
                generatedByMemberId,
                fileUrl: file.fileUrl,
                filePublicId: file.filePublicId,
                fileResourceType: file.fileResourceType,
                fileName: file.fileName,
                fileFormat: file.fileFormat,
                generatedAt: now,
                workspace: input.workspace,
            })
            : null;

        return {
            report,
            file,
        };
    } catch (error) {
        await deleteFromCloudinary(file.filePublicId, file.fileResourceType);
        throw error;
    }
}

export async function exportBudgetSummaryService(
    input: ExportBudgetSummaryServiceInput
): Promise<ExportReportResponse> {
    const summary = await getBudgetSummaryReportService(
        input.workspaceId,
        input.body.filters ?? {}
    );

    const { headers, rows } = buildBudgetSummaryExportRows(summary);
    const now = new Date();
    const baseFileName = `${sanitizeFileName(input.body.name)}-${getTimestampFilePart(now)}`;

    const localFile = await writeExportFile({
        exportFormat: input.body.exportFormat,
        baseFileName,
        sheetName: "Budget Summary",
        headers,
        rows,
    });

    const file = await uploadGeneratedExportFile(localFile);

    const generatedByMemberId = parseOptionalObjectId(input.body.generatedByMemberId);
    const persistReport = input.body.persistReport ?? true;

    try {
        const report = persistReport
            ? await persistGeneratedReport({
                workspaceId: input.workspaceId,
                body: input.body,
                type: input.reportType,
                generatedByMemberId,
                fileUrl: file.fileUrl,
                filePublicId: file.filePublicId,
                fileResourceType: file.fileResourceType,
                fileName: file.fileName,
                fileFormat: file.fileFormat,
                generatedAt: now,
                workspace: input.workspace,
            })
            : null;

        return {
            report,
            file,
        };
    } catch (error) {
        await deleteFromCloudinary(file.filePublicId, file.fileResourceType);
        throw error;
    }
}