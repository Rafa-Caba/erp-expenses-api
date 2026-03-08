import { z } from "zod";

import {
    PAYMENT_METHOD_VALUES,
    PAYMENT_STATUS_VALUES,
} from "../types/payments.types";

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

const createPaymentBodySchema = z
    .object({
        debtId: z.string().trim().min(1, "El id de la deuda es obligatorio."),
        accountId: nullableTrimmedStringSchema,
        cardId: nullableTrimmedStringSchema,
        memberId: nullableTrimmedStringSchema,
        transactionId: nullableTrimmedStringSchema,
        amount: z
            .number({
                message: "El monto debe ser numérico.",
            })
            .positive("El monto debe ser mayor a 0."),
        currency: z.enum(["MXN", "USD"], {
            message: "La moneda no es válida.",
        }),
        paymentDate: z.string().trim().refine(isValidDateString, {
            message: "La fecha de pago no es válida.",
        }),
        method: z
            .enum(PAYMENT_METHOD_VALUES, {
                message: "El método de pago no es válido.",
            })
            .nullable()
            .optional(),
        reference: z
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
                {
                    message: "La referencia no puede exceder 120 caracteres.",
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
        status: z
            .enum(PAYMENT_STATUS_VALUES, {
                message: "El estatus del pago no es válido.",
            })
            .optional(),
        isVisible: formBooleanSchema.optional(),
    })
    .superRefine((body, ctx) => {
        const hasAccountId =
            typeof body.accountId === "string" && body.accountId.trim().length > 0;
        const hasCardId =
            typeof body.cardId === "string" && body.cardId.trim().length > 0;

        if (hasAccountId && hasCardId) {
            ctx.addIssue({
                code: "custom",
                path: ["accountId"],
                message: "No puedes enviar accountId y cardId al mismo tiempo.",
            });

            ctx.addIssue({
                code: "custom",
                path: ["cardId"],
                message: "No puedes enviar cardId y accountId al mismo tiempo.",
            });
        }
    });

const updatePaymentBodySchema = z
    .object({
        debtId: z
            .string()
            .trim()
            .min(1, "El id de la deuda es obligatorio.")
            .optional(),
        accountId: nullableTrimmedStringSchema,
        cardId: nullableTrimmedStringSchema,
        memberId: nullableTrimmedStringSchema,
        transactionId: nullableTrimmedStringSchema,
        amount: z
            .number({
                message: "El monto debe ser numérico.",
            })
            .positive("El monto debe ser mayor a 0.")
            .optional(),
        currency: z
            .enum(["MXN", "USD"], {
                message: "La moneda no es válida.",
            })
            .optional(),
        paymentDate: z
            .string()
            .trim()
            .refine(isValidDateString, {
                message: "La fecha de pago no es válida.",
            })
            .optional(),
        method: z
            .enum(PAYMENT_METHOD_VALUES, {
                message: "El método de pago no es válido.",
            })
            .nullable()
            .optional(),
        reference: z
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
                {
                    message: "La referencia no puede exceder 120 caracteres.",
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
        status: z
            .enum(PAYMENT_STATUS_VALUES, {
                message: "El estatus del pago no es válido.",
            })
            .optional(),
        isVisible: formBooleanSchema.optional(),
    })
    .superRefine((body, ctx) => {
        const hasAccountId =
            typeof body.accountId === "string" && body.accountId.trim().length > 0;
        const hasCardId =
            typeof body.cardId === "string" && body.cardId.trim().length > 0;

        if (hasAccountId && hasCardId) {
            ctx.addIssue({
                code: "custom",
                path: ["accountId"],
                message: "No puedes enviar accountId y cardId al mismo tiempo.",
            });

            ctx.addIssue({
                code: "custom",
                path: ["cardId"],
                message: "No puedes enviar cardId y accountId al mismo tiempo.",
            });
        }
    });

export const workspacePaymentParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});

export const paymentParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
        paymentId: z.string().trim().min(1, "El id del pago es obligatorio."),
    }),
});

export const createPaymentSchema = z.object({
    body: createPaymentBodySchema,
});

export const updatePaymentSchema = z.object({
    body: updatePaymentBodySchema,
});