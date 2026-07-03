// src/subscriptions/schemas/subscription.schemas.ts
// Zod request validation for subscriptions/recurring expenses.
// Phase 9B adds process-due validation for the recurring subscription engine.

import { z } from "zod";

import { TRANSACTION_STATUS_VALUES } from "@/src/transactions/types/transaction.types";
import {
    SUBSCRIPTION_BILLING_FREQUENCY_VALUES,
    SUBSCRIPTION_STATUS_VALUES,
} from "../types/subscription.types";

function isValidDateString(value: string): boolean {
    const parsedDate = new Date(value);
    return !Number.isNaN(parsedDate.getTime());
}

const nullableIdSchema = z.string().trim().min(1).nullable().optional();

const nullableTrimmedStringSchema = z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
        if (value === undefined || value === null) {
            return value;
        }

        return value.trim();
    });

const optionalNullableDateSchema = z
    .union([z.string(), z.null()])
    .optional()
    .refine(
        (value) => value === undefined || value === null || isValidDateString(value),
        {
            message: "La fecha no es válida.",
        }
    );

const optionalNullableBillingDaySchema = z
    .number({ message: "El día de cobro debe ser numérico." })
    .int("El día de cobro debe ser un número entero.")
    .min(1, "El día de cobro mínimo es 1.")
    .max(31, "El día de cobro máximo es 31.")
    .nullable()
    .optional();

const baseSubscriptionBodySchema = z.object({
    memberId: z.string().trim().min(1, "El miembro es obligatorio."),
    categoryId: z.string().trim().min(1, "La categoría es obligatoria."),
    accountId: nullableIdSchema,
    cardId: nullableIdSchema,
    name: z
        .string()
        .trim()
        .min(1, "El nombre de la suscripción es obligatorio.")
        .max(160, "El nombre no puede exceder 160 caracteres."),
    merchant: nullableTrimmedStringSchema.refine(
        (value) => value === undefined || value === null || value.length <= 160,
        {
            message: "El merchant no puede exceder 160 caracteres.",
        }
    ),
    amount: z.number().positive("El monto debe ser mayor a 0."),
    currency: z.enum(["MXN", "USD"], {
        message: "La moneda no es válida.",
    }),
    billingFrequency: z.enum(SUBSCRIPTION_BILLING_FREQUENCY_VALUES, {
        message: "La frecuencia no es válida.",
    }),
    billingDay: optionalNullableBillingDaySchema,
    startDate: z.string().trim().refine(isValidDateString, {
        message: "La fecha de inicio no es válida.",
    }),
    nextBillingDate: z.string().trim().refine(isValidDateString, {
        message: "La fecha del próximo cobro no es válida.",
    }),
    endDate: optionalNullableDateSchema,
    status: z.enum(SUBSCRIPTION_STATUS_VALUES).optional(),
    autoCreateTransaction: z.boolean().optional(),
    notes: nullableTrimmedStringSchema.refine(
        (value) => value === undefined || value === null || value.length <= 1000,
        {
            message: "Las notas no pueden exceder 1000 caracteres.",
        }
    ),
    isVisible: z.boolean().optional(),
});

const updateSubscriptionBodySchema = z
    .object({
        memberId: z.string().trim().min(1, "El miembro es obligatorio.").optional(),
        categoryId: z.string().trim().min(1, "La categoría es obligatoria.").optional(),
        accountId: nullableIdSchema,
        cardId: nullableIdSchema,
        name: z
            .string()
            .trim()
            .min(1, "El nombre de la suscripción es obligatorio.")
            .max(160, "El nombre no puede exceder 160 caracteres.")
            .optional(),
        merchant: nullableTrimmedStringSchema.refine(
            (value) => value === undefined || value === null || value.length <= 160,
            {
                message: "El merchant no puede exceder 160 caracteres.",
            }
        ),
        amount: z.number().positive("El monto debe ser mayor a 0.").optional(),
        currency: z
            .enum(["MXN", "USD"], {
                message: "La moneda no es válida.",
            })
            .optional(),
        billingFrequency: z
            .enum(SUBSCRIPTION_BILLING_FREQUENCY_VALUES, {
                message: "La frecuencia no es válida.",
            })
            .optional(),
        billingDay: optionalNullableBillingDaySchema,
        startDate: z
            .string()
            .trim()
            .refine(isValidDateString, {
                message: "La fecha de inicio no es válida.",
            })
            .optional(),
        nextBillingDate: z
            .string()
            .trim()
            .refine(isValidDateString, {
                message: "La fecha del próximo cobro no es válida.",
            })
            .optional(),
        endDate: optionalNullableDateSchema,
        status: z.enum(SUBSCRIPTION_STATUS_VALUES).optional(),
        autoCreateTransaction: z.boolean().optional(),
        lastTransactionId: nullableIdSchema,
        notes: nullableTrimmedStringSchema.refine(
            (value) => value === undefined || value === null || value.length <= 1000,
            {
                message: "Las notas no pueden exceder 1000 caracteres.",
            }
        ),
        isVisible: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
        if (
            data.accountId !== undefined &&
            data.cardId !== undefined &&
            Boolean(data.accountId) &&
            Boolean(data.cardId)
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["cardId"],
                message: "No puedes enviar accountId y cardId al mismo tiempo.",
            });
        }
    });

const createSubscriptionBodySchema = baseSubscriptionBodySchema.superRefine((data, ctx) => {
    const hasAccount = Boolean(data.accountId);
    const hasCard = Boolean(data.cardId);

    if (!hasAccount && !hasCard) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["accountId"],
            message: "Debes seleccionar una cuenta o tarjeta para la suscripción.",
        });
    }

    if (hasAccount && hasCard) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["cardId"],
            message: "No puedes enviar accountId y cardId al mismo tiempo.",
        });
    }
});

const createSubscriptionTransactionBodySchema = z.object({
    transactionDate: z
        .string()
        .trim()
        .refine(isValidDateString, {
            message: "La fecha de transacción no es válida.",
        })
        .optional(),
    status: z.enum(TRANSACTION_STATUS_VALUES).optional(),
    reference: nullableTrimmedStringSchema,
    notes: nullableTrimmedStringSchema.refine(
        (value) => value === undefined || value === null || value.length <= 1000,
        {
            message: "Las notas no pueden exceder 1000 caracteres.",
        }
    ),
});

const processDueSubscriptionsBodySchema = z.object({
    asOfDate: z
        .string()
        .trim()
        .refine(isValidDateString, {
            message: "La fecha de corte no es válida.",
        })
        .optional(),
    dryRun: z.boolean().optional(),
    limit: z
        .number({ message: "El límite debe ser numérico." })
        .int("El límite debe ser un número entero.")
        .min(1, "El límite mínimo es 1.")
        .max(100, "El límite máximo es 100.")
        .optional(),
});

export const workspaceSubscriptionParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});

export const subscriptionParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
        subscriptionId: z.string().trim().min(1, "El id de la suscripción es obligatorio."),
    }),
});

export const createSubscriptionSchema = z.object({
    body: createSubscriptionBodySchema,
});

export const updateSubscriptionSchema = z.object({
    body: updateSubscriptionBodySchema,
});

export const createSubscriptionTransactionSchema = z.object({
    body: createSubscriptionTransactionBodySchema,
});

export const processDueSubscriptionsSchema = z.object({
    body: processDueSubscriptionsBodySchema,
});