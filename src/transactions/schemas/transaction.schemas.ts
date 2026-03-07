// src/transactions/schemas/transactions.schemas.ts

import { z } from "zod";

const currencySchema = z.enum(["MXN", "USD"]);
const transactionTypeSchema = z.enum([
    "expense",
    "income",
    "debt_payment",
    "transfer",
    "adjustment",
]);
const transactionStatusSchema = z.enum(["pending", "posted", "cancelled"]);

const nullableIdSchema = z.string().trim().min(1).nullable().optional();

function isValidDateString(value: string): boolean {
    const parsedDate = new Date(value);
    return !Number.isNaN(parsedDate.getTime());
}

const createTransactionBodySchema = z
    .object({
        accountId: nullableIdSchema,
        destinationAccountId: nullableIdSchema,
        cardId: nullableIdSchema,
        memberId: z.string().trim().min(1, "El miembro es obligatorio."),
        categoryId: nullableIdSchema,
        type: transactionTypeSchema,
        amount: z.number().positive("El monto debe ser mayor a 0."),
        currency: currencySchema,
        description: z
            .string()
            .trim()
            .min(1, "La descripción es obligatoria.")
            .max(255, "La descripción no puede exceder 255 caracteres."),
        merchant: z
            .string()
            .trim()
            .max(120, "El comercio no puede exceder 120 caracteres.")
            .nullable()
            .optional(),
        transactionDate: z
            .string()
            .trim()
            .min(1, "La fecha de transacción es obligatoria.")
            .refine(isValidDateString, {
                message: "La fecha de transacción no es válida.",
            }),
        status: transactionStatusSchema.optional(),
        reference: z
            .string()
            .trim()
            .max(120, "La referencia no puede exceder 120 caracteres.")
            .nullable()
            .optional(),
        notes: z
            .string()
            .trim()
            .max(1000, "Las notas no pueden exceder 1000 caracteres.")
            .nullable()
            .optional(),
        isRecurring: z.boolean().optional(),
        recurrenceRule: z
            .string()
            .trim()
            .max(255, "La regla de recurrencia no puede exceder 255 caracteres.")
            .nullable()
            .optional(),
        isVisible: z.boolean().optional(),
        createdByUserId: z.string().trim().min(1, "El usuario creador es obligatorio."),
    })
    .superRefine((data, ctx) => {
        const hasAccount = Boolean(data.accountId);
        const hasDestinationAccount = Boolean(data.destinationAccountId);
        const hasCard = Boolean(data.cardId);
        const hasCategory = Boolean(data.categoryId);

        if (data.type === "transfer") {
            if (!hasAccount) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["accountId"],
                    message: "accountId es obligatorio para transacciones tipo transfer.",
                });
            }

            if (!hasDestinationAccount) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["destinationAccountId"],
                    message: "destinationAccountId es obligatorio para transacciones tipo transfer.",
                });
            }

            if (hasAccount && hasDestinationAccount && data.accountId === data.destinationAccountId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["destinationAccountId"],
                    message: "La cuenta destino debe ser diferente a la cuenta origen.",
                });
            }

            if (hasCard) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["cardId"],
                    message: "cardId no aplica para transacciones tipo transfer.",
                });
            }
        }

        if (data.type === "debt_payment") {
            if (!hasAccount) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["accountId"],
                    message: "accountId es obligatorio para transacciones tipo debt_payment.",
                });
            }

            if (!hasCard) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["cardId"],
                    message: "cardId es obligatorio para transacciones tipo debt_payment.",
                });
            }
        }

        if (
            data.type === "expense" ||
            data.type === "income" ||
            data.type === "adjustment"
        ) {
            if (!hasAccount && !hasCard) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["accountId"],
                    message: "Debes enviar accountId o cardId para este tipo de transacción.",
                });
            }

            if (!hasCategory) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["categoryId"],
                    message: "categoryId es obligatorio para este tipo de transacción.",
                });
            }

            if (hasDestinationAccount) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["destinationAccountId"],
                    message: "destinationAccountId solo aplica a transacciones tipo transfer.",
                });
            }
        }

        if (data.isRecurring === true && !data.recurrenceRule) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["recurrenceRule"],
                message: "recurrenceRule es obligatorio cuando isRecurring es true.",
            });
        }

        if (data.isRecurring !== true && data.recurrenceRule) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["recurrenceRule"],
                message: "recurrenceRule solo aplica cuando isRecurring es true.",
            });
        }
    });

const updateTransactionBodySchema = z
    .object({
        accountId: nullableIdSchema,
        destinationAccountId: nullableIdSchema,
        cardId: nullableIdSchema,
        memberId: z.string().trim().min(1).optional(),
        categoryId: nullableIdSchema,
        type: transactionTypeSchema.optional(),
        amount: z.number().positive("El monto debe ser mayor a 0.").optional(),
        currency: currencySchema.optional(),
        description: z
            .string()
            .trim()
            .min(1, "La descripción no puede estar vacía.")
            .max(255, "La descripción no puede exceder 255 caracteres.")
            .optional(),
        merchant: z
            .string()
            .trim()
            .max(120, "El comercio no puede exceder 120 caracteres.")
            .nullable()
            .optional(),
        transactionDate: z
            .string()
            .trim()
            .refine(isValidDateString, {
                message: "La fecha de transacción no es válida.",
            })
            .optional(),
        status: transactionStatusSchema.optional(),
        reference: z
            .string()
            .trim()
            .max(120, "La referencia no puede exceder 120 caracteres.")
            .nullable()
            .optional(),
        notes: z
            .string()
            .trim()
            .max(1000, "Las notas no pueden exceder 1000 caracteres.")
            .nullable()
            .optional(),
        isRecurring: z.boolean().optional(),
        recurrenceRule: z
            .string()
            .trim()
            .max(255, "La regla de recurrencia no puede exceder 255 caracteres.")
            .nullable()
            .optional(),
        isActive: z.boolean().optional(),
        isArchived: z.boolean().optional(),
        isVisible: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
        const hasType = data.type !== undefined;
        const hasAccount = data.accountId !== undefined ? Boolean(data.accountId) : undefined;
        const hasDestinationAccount =
            data.destinationAccountId !== undefined
                ? Boolean(data.destinationAccountId)
                : undefined;
        const hasCard = data.cardId !== undefined ? Boolean(data.cardId) : undefined;
        const hasCategory = data.categoryId !== undefined ? Boolean(data.categoryId) : undefined;

        if (hasType && data.type === "transfer") {
            if (hasAccount === false) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["accountId"],
                    message: "accountId es obligatorio para transacciones tipo transfer.",
                });
            }

            if (hasDestinationAccount === false) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["destinationAccountId"],
                    message: "destinationAccountId es obligatorio para transacciones tipo transfer.",
                });
            }

            if (
                data.accountId !== undefined &&
                data.destinationAccountId !== undefined &&
                data.accountId &&
                data.destinationAccountId &&
                data.accountId === data.destinationAccountId
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["destinationAccountId"],
                    message: "La cuenta destino debe ser diferente a la cuenta origen.",
                });
            }

            if (hasCard === true) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["cardId"],
                    message: "cardId no aplica para transacciones tipo transfer.",
                });
            }
        }

        if (hasType && data.type === "debt_payment") {
            if (hasAccount === false) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["accountId"],
                    message: "accountId es obligatorio para transacciones tipo debt_payment.",
                });
            }

            if (hasCard === false) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["cardId"],
                    message: "cardId es obligatorio para transacciones tipo debt_payment.",
                });
            }
        }

        if (
            hasType &&
            (data.type === "expense" || data.type === "income" || data.type === "adjustment")
        ) {
            if (hasAccount === false && hasCard === false) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["accountId"],
                    message: "Debes enviar accountId o cardId para este tipo de transacción.",
                });
            }

            if (hasCategory === false) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["categoryId"],
                    message: "categoryId es obligatorio para este tipo de transacción.",
                });
            }

            if (hasDestinationAccount === true) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["destinationAccountId"],
                    message: "destinationAccountId solo aplica a transacciones tipo transfer.",
                });
            }
        }

        if (data.isRecurring === true && !data.recurrenceRule) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["recurrenceRule"],
                message: "recurrenceRule es obligatorio cuando isRecurring es true.",
            });
        }

        if (data.isRecurring === false && data.recurrenceRule) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["recurrenceRule"],
                message: "recurrenceRule solo aplica cuando isRecurring es true.",
            });
        }
    });

export const workspaceTransactionParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});

export const transactionParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
        transactionId: z.string().trim().min(1, "El id de la transacción es obligatorio."),
    }),
});

export const createTransactionSchema = z.object({
    body: createTransactionBodySchema,
});

export const updateTransactionSchema = z.object({
    body: updateTransactionBodySchema,
});