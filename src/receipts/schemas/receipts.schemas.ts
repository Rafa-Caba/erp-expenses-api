// src/receipts/schemas/receipts.schemas.ts

import { z } from "zod";

function isValidDateString(value: string): boolean {
    const parsedDate = new Date(value);
    return !Number.isNaN(parsedDate.getTime());
}

function parseFormBoolean(value: unknown): boolean | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        const normalizedValue = value.trim().toLowerCase();

        if (["true", "1", "yes", "y", "on"].includes(normalizedValue)) {
            return true;
        }

        if (["false", "0", "no", "n", "off"].includes(normalizedValue)) {
            return false;
        }
    }

    return undefined;
}

const createReceiptBodySchema = z.object({
    transactionId: z.string().trim().min(1, "El id de la transacción es obligatorio."),
    uploadedByMemberId: z.string().trim().min(1, "El miembro que sube el archivo es obligatorio."),
    notes: z
        .string()
        .trim()
        .max(1000, "Las notas no pueden exceder 1000 caracteres.")
        .nullable()
        .optional(),
    isVisible: z.preprocess(parseFormBoolean, z.boolean()).optional(),
    uploadedAt: z
        .string()
        .trim()
        .refine(isValidDateString, {
            message: "La fecha de carga no es válida.",
        })
        .optional(),
});

const updateReceiptBodySchema = z.object({
    transactionId: z.string().trim().min(1).optional(),
    uploadedByMemberId: z.string().trim().min(1).optional(),
    notes: z
        .string()
        .trim()
        .max(1000, "Las notas no pueden exceder 1000 caracteres.")
        .nullable()
        .optional(),
    isVisible: z.preprocess(parseFormBoolean, z.boolean()).optional(),
    uploadedAt: z
        .string()
        .trim()
        .refine(isValidDateString, {
            message: "La fecha de carga no es válida.",
        })
        .optional(),
});

export const workspaceReceiptParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});

export const receiptParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
        receiptId: z.string().trim().min(1, "El id del recibo es obligatorio."),
    }),
});

export const transactionReceiptParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
        transactionId: z.string().trim().min(1, "El id de la transacción es obligatorio."),
    }),
});

export const createReceiptSchema = z.object({
    body: createReceiptBodySchema,
});

export const updateReceiptSchema = z.object({
    body: updateReceiptBodySchema,
});