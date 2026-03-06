// src/accounts/schemas/account.schemas.ts

import { z } from "zod";

const accountTypeSchema = z.enum(["cash", "bank", "wallet", "savings", "credit"]);
const currencySchema = z.enum(["MXN", "USD"]);

function isMaskedAccountNumber(value: string): boolean {
    return /^[0-9*Xx\-\s]+$/.test(value);
}

const createAccountBodySchema = z
    .object({
        ownerMemberId: z.string().trim().min(1).optional(),
        name: z
            .string()
            .trim()
            .min(1, "El nombre es obligatorio.")
            .max(120, "El nombre no puede exceder 120 caracteres."),
        type: accountTypeSchema,
        bankName: z
            .string()
            .trim()
            .max(120, "El nombre del banco no puede exceder 120 caracteres.")
            .optional(),
        accountNumberMasked: z
            .string()
            .trim()
            .max(30, "La máscara de cuenta no puede exceder 30 caracteres.")
            .refine(isMaskedAccountNumber, {
                message: "La cuenta debe venir en formato enmascarado.",
            })
            .optional(),
        currency: currencySchema,
        initialBalance: z.number(),
        currentBalance: z.number().optional(),
        creditLimit: z.number().min(0).optional(),
        statementClosingDay: z.number().int().min(1).max(31).optional(),
        paymentDueDay: z.number().int().min(1).max(31).optional(),
        notes: z
            .string()
            .trim()
            .max(1000, "Las notas no pueden exceder 1000 caracteres.")
            .optional(),
        isActive: z.boolean().optional(),
        isArchived: z.boolean().optional(),
        isVisible: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.type === "credit") {
            return;
        }

        if (data.creditLimit !== undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["creditLimit"],
                message: "creditLimit solo aplica a cuentas tipo credit.",
            });
        }

        if (data.statementClosingDay !== undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["statementClosingDay"],
                message: "statementClosingDay solo aplica a cuentas tipo credit.",
            });
        }

        if (data.paymentDueDay !== undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["paymentDueDay"],
                message: "paymentDueDay solo aplica a cuentas tipo credit.",
            });
        }
    });

const updateAccountBodySchema = z
    .object({
        ownerMemberId: z.string().trim().min(1).optional(),
        name: z
            .string()
            .trim()
            .min(1, "El nombre no puede estar vacío.")
            .max(120, "El nombre no puede exceder 120 caracteres.")
            .optional(),
        type: accountTypeSchema.optional(),
        bankName: z
            .string()
            .trim()
            .max(120, "El nombre del banco no puede exceder 120 caracteres.")
            .optional(),
        accountNumberMasked: z
            .string()
            .trim()
            .max(30, "La máscara de cuenta no puede exceder 30 caracteres.")
            .refine(isMaskedAccountNumber, {
                message: "La cuenta debe venir en formato enmascarado.",
            })
            .optional(),
        currency: currencySchema.optional(),
        initialBalance: z.number().optional(),
        currentBalance: z.number().optional(),
        creditLimit: z.number().min(0).optional(),
        statementClosingDay: z.number().int().min(1).max(31).optional(),
        paymentDueDay: z.number().int().min(1).max(31).optional(),
        notes: z
            .string()
            .trim()
            .max(1000, "Las notas no pueden exceder 1000 caracteres.")
            .optional(),
        isActive: z.boolean().optional(),
        isArchived: z.boolean().optional(),
        isVisible: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
        const hasNonCreditData =
            data.creditLimit !== undefined ||
            data.statementClosingDay !== undefined ||
            data.paymentDueDay !== undefined;

        if (data.type !== undefined && data.type !== "credit" && hasNonCreditData) {
            if (data.creditLimit !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["creditLimit"],
                    message: "creditLimit solo aplica a cuentas tipo credit.",
                });
            }

            if (data.statementClosingDay !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["statementClosingDay"],
                    message: "statementClosingDay solo aplica a cuentas tipo credit.",
                });
            }

            if (data.paymentDueDay !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["paymentDueDay"],
                    message: "paymentDueDay solo aplica a cuentas tipo credit.",
                });
            }
        }
    });

export const workspaceAccountParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});

export const accountParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
        accountId: z.string().trim().min(1, "El id de la cuenta es obligatorio."),
    }),
});

export const createAccountSchema = z.object({
    body: createAccountBodySchema,
});

export const updateAccountSchema = z.object({
    body: updateAccountBodySchema,
});