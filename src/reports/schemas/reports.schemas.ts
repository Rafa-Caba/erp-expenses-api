import { z } from "zod";

import {
    REPORT_GROUP_BY_VALUES,
    REPORT_STATUS_VALUES,
    REPORT_TYPE_VALUES,
} from "../types/reports.types";

function isValidDateString(value: string): boolean {
    const parsedDate = new Date(value);
    return !Number.isNaN(parsedDate.getTime());
}

const formBooleanSchema = z.union([
    z.boolean(),
    z.literal("true").transform(() => true),
    z.literal("false").transform(() => false),
    z.literal("1").transform(() => true),
    z.literal("0").transform(() => false),
    z.literal("yes").transform(() => true),
    z.literal("no").transform(() => false),
    z.literal("y").transform(() => true),
    z.literal("n").transform(() => false),
    z.literal("on").transform(() => true),
    z.literal("off").transform(() => false),
]);

const nullableTrimmedStringSchema = z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
        if (value === undefined || value === null) {
            return value;
        }

        const normalizedValue = value.trim();
        return normalizedValue.length > 0 ? normalizedValue : null;
    });

const reportFiltersSchema = z
    .object({
        dateFrom: nullableTrimmedStringSchema.refine(
            (value) => value === undefined || value === null || isValidDateString(value),
            {
                message: "La fecha inicial del filtro no es válida.",
            }
        ),
        dateTo: nullableTrimmedStringSchema.refine(
            (value) => value === undefined || value === null || isValidDateString(value),
            {
                message: "La fecha final del filtro no es válida.",
            }
        ),
        currency: z.enum(["MXN", "USD"]).nullable().optional(),
        memberId: nullableTrimmedStringSchema,
        categoryId: nullableTrimmedStringSchema,
        accountId: nullableTrimmedStringSchema,
        cardId: nullableTrimmedStringSchema,
        includeArchived: z.union([z.boolean(), z.null()]).optional(),
        groupBy: z.enum(REPORT_GROUP_BY_VALUES).nullable().optional(),
    })
    .superRefine((filters, ctx) => {
        if (filters.dateFrom && filters.dateTo) {
            const parsedDateFrom = new Date(filters.dateFrom);
            const parsedDateTo = new Date(filters.dateTo);

            if (parsedDateTo.getTime() < parsedDateFrom.getTime()) {
                ctx.addIssue({
                    code: "custom",
                    path: ["dateTo"],
                    message: "La fecha final no puede ser anterior a la fecha inicial.",
                });
            }
        }
    });

const createReportBodySchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "El nombre del reporte es obligatorio.")
        .max(255, "El nombre del reporte no puede exceder 255 caracteres."),
    type: z.enum(REPORT_TYPE_VALUES, {
        message: "El tipo de reporte no es válido.",
    }),
    filters: reportFiltersSchema.nullable().optional(),
    generatedByMemberId: nullableTrimmedStringSchema,
    fileUrl: z
        .union([z.string().url("El fileUrl no es válido."), z.null()])
        .optional(),
    notes: z
        .union([z.string(), z.null()])
        .optional()
        .transform((value) => {
            if (value === undefined || value === null) {
                return value;
            }

            return value.trim();
        })
        .refine(
            (value) => value === undefined || value === null || value.length <= 1000,
            {
                message: "Las notas no pueden exceder 1000 caracteres.",
            }
        ),
    status: z
        .enum(REPORT_STATUS_VALUES, {
            message: "El estatus del reporte no es válido.",
        })
        .optional(),
    isVisible: formBooleanSchema.optional(),
    generatedAt: z
        .union([z.string(), z.null()])
        .optional()
        .refine(
            (value) => value === undefined || value === null || isValidDateString(value),
            {
                message: "La fecha de generación no es válida.",
            }
        ),
});

const updateReportBodySchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "El nombre del reporte es obligatorio.")
        .max(255, "El nombre del reporte no puede exceder 255 caracteres.")
        .optional(),
    type: z
        .enum(REPORT_TYPE_VALUES, {
            message: "El tipo de reporte no es válido.",
        })
        .optional(),
    filters: reportFiltersSchema.nullable().optional(),
    generatedByMemberId: nullableTrimmedStringSchema,
    fileUrl: z
        .union([z.string().url("El fileUrl no es válido."), z.null()])
        .optional(),
    notes: z
        .union([z.string(), z.null()])
        .optional()
        .transform((value) => {
            if (value === undefined || value === null) {
                return value;
            }

            return value.trim();
        })
        .refine(
            (value) => value === undefined || value === null || value.length <= 1000,
            {
                message: "Las notas no pueden exceder 1000 caracteres.",
            }
        ),
    status: z
        .enum(REPORT_STATUS_VALUES, {
            message: "El estatus del reporte no es válido.",
        })
        .optional(),
    isVisible: formBooleanSchema.optional(),
    generatedAt: z
        .union([z.string(), z.null()])
        .optional()
        .refine(
            (value) => value === undefined || value === null || isValidDateString(value),
            {
                message: "La fecha de generación no es válida.",
            }
        ),
});

export const workspaceReportParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});

export const reportParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
        reportId: z.string().trim().min(1, "El id del reporte es obligatorio."),
    }),
});

export const createReportSchema = z.object({
    body: createReportBodySchema,
});

export const updateReportSchema = z.object({
    body: updateReportBodySchema,
});