// src/cards/schemas/card.schemas.ts

import { z } from "zod";

const cardTypeSchema = z.enum(["debit", "credit"]);

function isLast4Digits(value: string): boolean {
    return /^\d{4}$/.test(value);
}

const createCardBodySchema = z
    .object({
        accountId: z.string().trim().min(1, "El accountId es obligatorio."),
        holderMemberId: z.string().trim().min(1).optional(),
        name: z
            .string()
            .trim()
            .min(1, "El nombre es obligatorio.")
            .max(120, "El nombre no puede exceder 120 caracteres."),
        type: cardTypeSchema,
        brand: z
            .string()
            .trim()
            .max(60, "La marca no puede exceder 60 caracteres.")
            .optional(),
        last4: z.string().trim().refine(isLast4Digits, {
            message: "last4 debe contener exactamente 4 dígitos.",
        }),
        creditLimit: z.number().min(0).optional(),
        closingDay: z.number().int().min(1).max(31).optional(),
        dueDay: z.number().int().min(1).max(31).optional(),
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
                message: "creditLimit solo aplica a tarjetas tipo credit.",
            });
        }

        if (data.closingDay !== undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["closingDay"],
                message: "closingDay solo aplica a tarjetas tipo credit.",
            });
        }

        if (data.dueDay !== undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["dueDay"],
                message: "dueDay solo aplica a tarjetas tipo credit.",
            });
        }
    });

const updateCardBodySchema = z
    .object({
        accountId: z.string().trim().min(1).optional(),
        holderMemberId: z.string().trim().min(1).optional(),
        name: z
            .string()
            .trim()
            .min(1, "El nombre no puede estar vacío.")
            .max(120, "El nombre no puede exceder 120 caracteres.")
            .optional(),
        type: cardTypeSchema.optional(),
        brand: z
            .string()
            .trim()
            .max(60, "La marca no puede exceder 60 caracteres.")
            .optional(),
        last4: z.string().trim().refine(isLast4Digits, {
            message: "last4 debe contener exactamente 4 dígitos.",
        }).optional(),
        creditLimit: z.number().min(0).optional(),
        closingDay: z.number().int().min(1).max(31).optional(),
        dueDay: z.number().int().min(1).max(31).optional(),
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
        const hasCreditFields =
            data.creditLimit !== undefined ||
            data.closingDay !== undefined ||
            data.dueDay !== undefined;

        if (data.type !== undefined && data.type !== "credit" && hasCreditFields) {
            if (data.creditLimit !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["creditLimit"],
                    message: "creditLimit solo aplica a tarjetas tipo credit.",
                });
            }

            if (data.closingDay !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["closingDay"],
                    message: "closingDay solo aplica a tarjetas tipo credit.",
                });
            }

            if (data.dueDay !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["dueDay"],
                    message: "dueDay solo aplica a tarjetas tipo credit.",
                });
            }
        }
    });

export const workspaceCardParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});

export const cardParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
        cardId: z.string().trim().min(1, "El id de la tarjeta es obligatorio."),
    }),
});

export const createCardSchema = z.object({
    body: createCardBodySchema,
});

export const updateCardSchema = z.object({
    body: updateCardBodySchema,
});