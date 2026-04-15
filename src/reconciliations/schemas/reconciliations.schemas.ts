// src/reconciliations/schemas/reconciliations.schemas.ts

import { z } from "zod";

import {
    RECONCILIATION_ENTRY_SIDE_VALUES,
    RECONCILIATION_MATCH_METHOD_VALUES,
    RECONCILIATION_STATUS_VALUES,
} from "../types/reconciliations.types";

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

const createReconciliationBodySchema = z.object({
    accountId: z.string().trim().min(1, "El id de la cuenta es obligatorio."),
    cardId: nullableTrimmedStringSchema,
    transactionId: z.string().trim().min(1, "El id de la transacción es obligatorio."),
    expectedAmount: z
        .number({ message: "El monto esperado debe ser numérico." })
        .min(0, "El monto esperado no puede ser negativo.")
        .optional(),
    actualAmount: z
        .number({ message: "El monto real debe ser numérico." })
        .min(0, "El monto real no puede ser negativo.")
        .optional(),
    statementDate: z
        .union([z.string(), z.null()])
        .optional()
        .refine(
            (value) => value === undefined || value === null || isValidDateString(value),
            { message: "La fecha del estado de cuenta no es válida." }
        ),
    statementReference: z
        .union([z.string(), z.null()])
        .optional()
        .transform((value) => {
            if (value === undefined || value === null) {
                return value;
            }

            return value.trim();
        })
        .refine(
            (value) => value === undefined || value === null || value.length <= 120,
            { message: "La referencia del estado de cuenta no puede exceder 120 caracteres." }
        ),
    matchMethod: z
        .enum(RECONCILIATION_MATCH_METHOD_VALUES, {
            message: "El método de conciliación no es válido.",
        })
        .optional(),
    status: z
        .enum(RECONCILIATION_STATUS_VALUES, {
            message: "El estatus de conciliación no es válido.",
        })
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
            { message: "Las notas no pueden exceder 1000 caracteres." }
        ),
    reconciledAt: z
        .union([z.string(), z.null()])
        .optional()
        .refine(
            (value) => value === undefined || value === null || isValidDateString(value),
            { message: "La fecha de conciliación no es válida." }
        ),
    isVisible: formBooleanSchema.optional(),
});

const updateReconciliationBodySchema = z.object({
    expectedAmount: z
        .number({ message: "El monto esperado debe ser numérico." })
        .min(0, "El monto esperado no puede ser negativo.")
        .optional(),
    actualAmount: z
        .number({ message: "El monto real debe ser numérico." })
        .min(0, "El monto real no puede ser negativo.")
        .optional(),
    statementDate: z
        .union([z.string(), z.null()])
        .optional()
        .refine(
            (value) => value === undefined || value === null || isValidDateString(value),
            { message: "La fecha del estado de cuenta no es válida." }
        ),
    statementReference: z
        .union([z.string(), z.null()])
        .optional()
        .transform((value) => {
            if (value === undefined || value === null) {
                return value;
            }

            return value.trim();
        })
        .refine(
            (value) => value === undefined || value === null || value.length <= 120,
            { message: "La referencia del estado de cuenta no puede exceder 120 caracteres." }
        ),
    matchMethod: z
        .enum(RECONCILIATION_MATCH_METHOD_VALUES, {
            message: "El método de conciliación no es válido.",
        })
        .optional(),
    status: z
        .enum(RECONCILIATION_STATUS_VALUES, {
            message: "El estatus de conciliación no es válido.",
        })
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
            { message: "Las notas no pueden exceder 1000 caracteres." }
        ),
    reconciledAt: z
        .union([z.string(), z.null()])
        .optional()
        .refine(
            (value) => value === undefined || value === null || isValidDateString(value),
            { message: "La fecha de conciliación no es válida." }
        ),
    isActive: formBooleanSchema.optional(),
    isArchived: formBooleanSchema.optional(),
    isVisible: formBooleanSchema.optional(),
});

const workspaceReconciliationParamsBodySchema = z.object({
    workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
});

const reconciliationParamsBodySchema = z.object({
    workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    reconciliationId: z.string().trim().min(1, "El id de la conciliación es obligatorio."),
});

const reconciliationListQueryBodySchema = z
    .object({
        accountId: z.string().trim().min(1).optional(),
        cardId: z.string().trim().min(1).optional(),
        memberId: z.string().trim().min(1).optional(),
        transactionId: z.string().trim().min(1).optional(),
        status: z.enum(RECONCILIATION_STATUS_VALUES).optional(),
        currency: z.enum(["MXN", "USD"]).optional(),
        entrySide: z.enum(RECONCILIATION_ENTRY_SIDE_VALUES).optional(),
        matchMethod: z.enum(RECONCILIATION_MATCH_METHOD_VALUES).optional(),
        includeArchived: z.string().optional(),
        includeInactive: z.string().optional(),
        includeHidden: z.string().optional(),
        transactionDateFrom: z
            .string()
            .trim()
            .optional()
            .refine((value) => value === undefined || isValidDateString(value), {
                message: "La fecha inicial de transacción no es válida.",
            }),
        transactionDateTo: z
            .string()
            .trim()
            .optional()
            .refine((value) => value === undefined || isValidDateString(value), {
                message: "La fecha final de transacción no es válida.",
            }),
        reconciledFrom: z
            .string()
            .trim()
            .optional()
            .refine((value) => value === undefined || isValidDateString(value), {
                message: "La fecha inicial de conciliación no es válida.",
            }),
        reconciledTo: z
            .string()
            .trim()
            .optional()
            .refine((value) => value === undefined || isValidDateString(value), {
                message: "La fecha final de conciliación no es válida.",
            }),
        statementDateFrom: z
            .string()
            .trim()
            .optional()
            .refine((value) => value === undefined || isValidDateString(value), {
                message: "La fecha inicial de estado de cuenta no es válida.",
            }),
        statementDateTo: z
            .string()
            .trim()
            .optional()
            .refine((value) => value === undefined || isValidDateString(value), {
                message: "La fecha final de estado de cuenta no es válida.",
            }),
    })
    .superRefine((query, ctx) => {
        if (query.transactionDateFrom && query.transactionDateTo) {
            const fromDate = new Date(query.transactionDateFrom);
            const toDate = new Date(query.transactionDateTo);

            if (toDate.getTime() < fromDate.getTime()) {
                ctx.addIssue({
                    code: "custom",
                    path: ["transactionDateTo"],
                    message:
                        "La fecha final de transacción no puede ser anterior a la fecha inicial.",
                });
            }
        }

        if (query.reconciledFrom && query.reconciledTo) {
            const fromDate = new Date(query.reconciledFrom);
            const toDate = new Date(query.reconciledTo);

            if (toDate.getTime() < fromDate.getTime()) {
                ctx.addIssue({
                    code: "custom",
                    path: ["reconciledTo"],
                    message:
                        "La fecha final de conciliación no puede ser anterior a la fecha inicial.",
                });
            }
        }

        if (query.statementDateFrom && query.statementDateTo) {
            const fromDate = new Date(query.statementDateFrom);
            const toDate = new Date(query.statementDateTo);

            if (toDate.getTime() < fromDate.getTime()) {
                ctx.addIssue({
                    code: "custom",
                    path: ["statementDateTo"],
                    message:
                        "La fecha final de estado de cuenta no puede ser anterior a la fecha inicial.",
                });
            }
        }
    });

export const workspaceReconciliationParamsSchema = z.object({
    params: workspaceReconciliationParamsBodySchema,
});

export const reconciliationParamsSchema = z.object({
    params: reconciliationParamsBodySchema,
});

export const createReconciliationSchema = z.object({
    body: createReconciliationBodySchema,
});

export const updateReconciliationSchema = z.object({
    body: updateReconciliationBodySchema,
});

export const reconciliationListQuerySchema = z.object({
    query: reconciliationListQueryBodySchema,
});