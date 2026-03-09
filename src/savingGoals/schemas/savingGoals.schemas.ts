import { z } from "zod";

import {
    SAVINGS_GOAL_CATEGORY_VALUES,
    SAVINGS_GOAL_PRIORITY_VALUES,
    SAVINGS_GOAL_STATUS_VALUES,
} from "../types/savingGoals.types";

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

const createSavingGoalBodySchema = z
    .object({
        accountId: nullableTrimmedStringSchema,
        memberId: nullableTrimmedStringSchema,
        name: z
            .string()
            .trim()
            .min(1, "El nombre de la meta de ahorro es obligatorio.")
            .max(255, "El nombre de la meta de ahorro no puede exceder 255 caracteres."),
        description: z
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
                    message: "La descripción no puede exceder 1000 caracteres.",
                }
            ),
        targetAmount: z
            .number({
                message: "La meta objetivo debe ser numérica.",
            })
            .positive("La meta objetivo debe ser mayor a 0."),
        currentAmount: z
            .number({
                message: "El monto actual debe ser numérico.",
            })
            .min(0, "El monto actual no puede ser menor a 0."),
        currency: z.enum(["MXN", "USD"], {
            message: "La moneda no es válida.",
        }),
        targetDate: z
            .union([z.string(), z.null()])
            .optional()
            .refine(
                (value) => value === undefined || value === null || isValidDateString(value),
                {
                    message: "La fecha objetivo no es válida.",
                }
            ),
        status: z
            .enum(SAVINGS_GOAL_STATUS_VALUES, {
                message: "El estatus de la meta de ahorro no es válido.",
            })
            .optional(),
        priority: z
            .enum(SAVINGS_GOAL_PRIORITY_VALUES, {
                message: "La prioridad no es válida.",
            })
            .nullable()
            .optional(),
        category: z
            .enum(SAVINGS_GOAL_CATEGORY_VALUES, {
                message: "La categoría no es válida.",
            })
            .optional(),
        isVisible: formBooleanSchema.optional(),
    })
    .superRefine((body, ctx) => {
        if (body.currentAmount > body.targetAmount) {
            ctx.addIssue({
                code: "custom",
                path: ["currentAmount"],
                message: "El monto actual no puede ser mayor a la meta objetivo.",
            });
        }
    });

const updateSavingGoalBodySchema = z
    .object({
        accountId: nullableTrimmedStringSchema,
        memberId: nullableTrimmedStringSchema,
        name: z
            .string()
            .trim()
            .min(1, "El nombre de la meta de ahorro es obligatorio.")
            .max(255, "El nombre de la meta de ahorro no puede exceder 255 caracteres.")
            .optional(),
        description: z
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
                    message: "La descripción no puede exceder 1000 caracteres.",
                }
            ),
        targetAmount: z
            .number({
                message: "La meta objetivo debe ser numérica.",
            })
            .positive("La meta objetivo debe ser mayor a 0.")
            .optional(),
        currentAmount: z
            .number({
                message: "El monto actual debe ser numérico.",
            })
            .min(0, "El monto actual no puede ser menor a 0.")
            .optional(),
        currency: z
            .enum(["MXN", "USD"], {
                message: "La moneda no es válida.",
            })
            .optional(),
        targetDate: z
            .union([z.string(), z.null()])
            .optional()
            .refine(
                (value) => value === undefined || value === null || isValidDateString(value),
                {
                    message: "La fecha objetivo no es válida.",
                }
            ),
        status: z
            .enum(SAVINGS_GOAL_STATUS_VALUES, {
                message: "El estatus de la meta de ahorro no es válido.",
            })
            .optional(),
        priority: z
            .enum(SAVINGS_GOAL_PRIORITY_VALUES, {
                message: "La prioridad no es válida.",
            })
            .nullable()
            .optional(),
        category: z
            .enum(SAVINGS_GOAL_CATEGORY_VALUES, {
                message: "La categoría no es válida.",
            })
            .optional(),
        isVisible: formBooleanSchema.optional(),
    });

export const workspaceSavingGoalParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});

export const savingGoalParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
        savingsGoalId: z.string().trim().min(1, "El id de la meta de ahorro es obligatorio."),
    }),
});

export const createSavingGoalSchema = z.object({
    body: createSavingGoalBodySchema,
});

export const updateSavingGoalSchema = z.object({
    body: updateSavingGoalBodySchema,
});