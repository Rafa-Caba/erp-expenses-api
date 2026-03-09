import { z } from "zod";

import {
    BUDGET_PERIOD_TYPE_VALUES,
    BUDGET_STATUS_VALUES,
} from "../types/budgets.types";

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

const createBudgetBodySchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "El nombre del presupuesto es obligatorio.")
            .max(255, "El nombre del presupuesto no puede exceder 255 caracteres."),
        periodType: z.enum(BUDGET_PERIOD_TYPE_VALUES, {
            message: "El tipo de periodo no es válido.",
        }),
        startDate: z.string().trim().refine(isValidDateString, {
            message: "La fecha de inicio no es válida.",
        }),
        endDate: z.string().trim().refine(isValidDateString, {
            message: "La fecha de fin no es válida.",
        }),
        limitAmount: z
            .number({
                message: "El límite del presupuesto debe ser numérico.",
            })
            .positive("El límite del presupuesto debe ser mayor a 0."),
        currency: z.enum(["MXN", "USD"], {
            message: "La moneda no es válida.",
        }),
        categoryId: nullableTrimmedStringSchema,
        memberId: nullableTrimmedStringSchema,
        alertPercent: z
            .union([z.number(), z.null()])
            .optional()
            .refine(
                (value) =>
                    value === undefined ||
                    value === null ||
                    (value >= 1 && value <= 100),
                {
                    message: "El porcentaje de alerta debe estar entre 1 y 100.",
                }
            ),
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
        isActive: formBooleanSchema.optional(),
        status: z
            .enum(BUDGET_STATUS_VALUES, {
                message: "El estatus del presupuesto no es válido.",
            })
            .optional(),
        isVisible: formBooleanSchema.optional(),
    })
    .superRefine((body, ctx) => {
        const parsedStartDate = new Date(body.startDate);
        const parsedEndDate = new Date(body.endDate);

        if (parsedEndDate.getTime() < parsedStartDate.getTime()) {
            ctx.addIssue({
                code: "custom",
                path: ["endDate"],
                message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
            });
        }
    });

const updateBudgetBodySchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "El nombre del presupuesto es obligatorio.")
            .max(255, "El nombre del presupuesto no puede exceder 255 caracteres.")
            .optional(),
        periodType: z
            .enum(BUDGET_PERIOD_TYPE_VALUES, {
                message: "El tipo de periodo no es válido.",
            })
            .optional(),
        startDate: z
            .string()
            .trim()
            .refine(isValidDateString, {
                message: "La fecha de inicio no es válida.",
            })
            .optional(),
        endDate: z
            .string()
            .trim()
            .refine(isValidDateString, {
                message: "La fecha de fin no es válida.",
            })
            .optional(),
        limitAmount: z
            .number({
                message: "El límite del presupuesto debe ser numérico.",
            })
            .positive("El límite del presupuesto debe ser mayor a 0.")
            .optional(),
        currency: z
            .enum(["MXN", "USD"], {
                message: "La moneda no es válida.",
            })
            .optional(),
        categoryId: nullableTrimmedStringSchema,
        memberId: nullableTrimmedStringSchema,
        alertPercent: z
            .union([z.number(), z.null()])
            .optional()
            .refine(
                (value) =>
                    value === undefined ||
                    value === null ||
                    (value >= 1 && value <= 100),
                {
                    message: "El porcentaje de alerta debe estar entre 1 y 100.",
                }
            ),
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
        isActive: formBooleanSchema.optional(),
        status: z
            .enum(BUDGET_STATUS_VALUES, {
                message: "El estatus del presupuesto no es válido.",
            })
            .optional(),
        isVisible: formBooleanSchema.optional(),
    });

export const workspaceBudgetParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});

export const budgetParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
        budgetId: z.string().trim().min(1, "El id del presupuesto es obligatorio."),
    }),
});

export const createBudgetSchema = z.object({
    body: createBudgetBodySchema,
});

export const updateBudgetSchema = z.object({
    body: updateBudgetBodySchema,
});