// src/debts/schemas/debts.schemas.ts

import { z } from "zod";

import {
    DEBT_STATUS_VALUES,
    DEBT_TYPE_VALUES,
} from "../types/debts.types";

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

        return value.trim();
    });

const createDebtBodySchema = z.object({
    memberId: nullableTrimmedStringSchema,
    relatedAccountId: nullableTrimmedStringSchema,
    type: z.enum(DEBT_TYPE_VALUES, {
        message: "El tipo de deuda no es válido.",
    }),
    personName: z
        .string()
        .trim()
        .min(1, "El nombre de la persona es obligatorio.")
        .max(255, "El nombre de la persona no puede exceder 255 caracteres."),
    personContact: z
        .union([z.string(), z.null()])
        .optional()
        .transform((value) => {
            if (value === undefined || value === null) {
                return value;
            }

            return value.trim();
        })
        .refine(
            (value) => value === undefined || value === null || value.length <= 255,
            {
                message: "El contacto no puede exceder 255 caracteres.",
            }
        ),
    originalAmount: z
        .number({
            message: "El monto original debe ser numérico.",
        })
        .positive("El monto original debe ser mayor a 0."),
    remainingAmount: z
        .number({
            message: "El monto restante debe ser numérico.",
        })
        .min(0, "El monto restante no puede ser menor a 0."),
    currency: z.enum(["MXN", "USD"], {
        message: "La moneda no es válida.",
    }),
    description: z
        .string()
        .trim()
        .min(1, "La descripción es obligatoria.")
        .max(1000, "La descripción no puede exceder 1000 caracteres."),
    startDate: z
        .string()
        .trim()
        .refine(isValidDateString, {
            message: "La fecha de inicio no es válida.",
        }),
    dueDate: z
        .union([z.string(), z.null()])
        .optional()
        .refine(
            (value) => value === undefined || value === null || isValidDateString(value),
            {
                message: "La fecha de vencimiento no es válida.",
            }
        ),
    status: z
        .enum(DEBT_STATUS_VALUES, {
            message: "El estatus de la deuda no es válido.",
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
            {
                message: "Las notas no pueden exceder 1000 caracteres.",
            }
        ),
    isVisible: formBooleanSchema.optional(),
});

const updateDebtBodySchema = z.object({
    memberId: nullableTrimmedStringSchema,
    relatedAccountId: nullableTrimmedStringSchema,
    type: z
        .enum(DEBT_TYPE_VALUES, {
            message: "El tipo de deuda no es válido.",
        })
        .optional(),
    personName: z
        .string()
        .trim()
        .min(1, "El nombre de la persona es obligatorio.")
        .max(255, "El nombre de la persona no puede exceder 255 caracteres.")
        .optional(),
    personContact: z
        .union([z.string(), z.null()])
        .optional()
        .transform((value) => {
            if (value === undefined || value === null) {
                return value;
            }

            return value.trim();
        })
        .refine(
            (value) => value === undefined || value === null || value.length <= 255,
            {
                message: "El contacto no puede exceder 255 caracteres.",
            }
        ),
    originalAmount: z
        .number({
            message: "El monto original debe ser numérico.",
        })
        .positive("El monto original debe ser mayor a 0.")
        .optional(),
    remainingAmount: z
        .number({
            message: "El monto restante debe ser numérico.",
        })
        .min(0, "El monto restante no puede ser menor a 0.")
        .optional(),
    currency: z
        .enum(["MXN", "USD"], {
            message: "La moneda no es válida.",
        })
        .optional(),
    description: z
        .string()
        .trim()
        .min(1, "La descripción es obligatoria.")
        .max(1000, "La descripción no puede exceder 1000 caracteres.")
        .optional(),
    startDate: z
        .string()
        .trim()
        .refine(isValidDateString, {
            message: "La fecha de inicio no es válida.",
        })
        .optional(),
    dueDate: z
        .union([z.string(), z.null()])
        .optional()
        .refine(
            (value) => value === undefined || value === null || isValidDateString(value),
            {
                message: "La fecha de vencimiento no es válida.",
            }
        ),
    status: z
        .enum(DEBT_STATUS_VALUES, {
            message: "El estatus de la deuda no es válido.",
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
            {
                message: "Las notas no pueden exceder 1000 caracteres.",
            }
        ),
    isVisible: formBooleanSchema.optional(),
});

export const workspaceDebtParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});

export const debtParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
        debtId: z.string().trim().min(1, "El id de la deuda es obligatorio."),
    }),
});

export const createDebtSchema = z.object({
    body: createDebtBodySchema,
});

export const updateDebtSchema = z.object({
    body: updateDebtBodySchema,
});