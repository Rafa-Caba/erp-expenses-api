import { Types } from "mongoose";

import { WorkspaceMemberModel } from "@/src/workspaces/models/WorkspaceMember.model";
import { ReportModel } from "../models/Report.model";
import type {
    CreateReportServiceInput,
    DeleteReportServiceInput,
    ReportDocument,
    ReportFilters,
    ReportStatus,
    UpdateReportServiceInput,
} from "../types/reports.types";

type OptionalObjectId = Types.ObjectId | null;

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
            "La fecha de generación no es válida.",
            400,
            "INVALID_GENERATED_AT"
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
        notes: report.notes ?? null,
        isVisible: report.isVisible ?? true,
        generatedAt: report.generatedAt ?? null,
    };
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
                fileUrl:
                    body.fileUrl !== undefined
                        ? normalizeNullableString(body.fileUrl)
                        : existingReport.fileUrl ?? null,
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

    return buildReportResponse(updatedReport);
}

export async function deleteReportService(
    input: DeleteReportServiceInput
): Promise<ReportDocument | null> {
    const { workspaceId, reportId } = input;

    return ReportModel.findOneAndDelete({
        _id: reportId,
        workspaceId,
    }).lean<ReportDocument | null>();
}