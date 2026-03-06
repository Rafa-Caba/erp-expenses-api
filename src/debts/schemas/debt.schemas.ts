// src/debts/schemas/debt.schemas.ts

import { z } from "zod";

export const DebtKindSchema = z.enum(["I_OWE", "OWE_ME"]);
export const DebtStatusSchema = z.enum(["ACTIVE", "PAID", "CANCELED"]);
export const VisibilitySchema = z.enum(["SHARED", "PRIVATE"]);
export const CurrencySchema = z.enum(["MXN", "USD"]);

export const CreateDebtSchema = z.object({
    kind: DebtKindSchema,
    principal: z.number().finite(),
    remaining: z.number().finite().optional(), // optional import
    counterparty: z.string().trim().min(1).max(200),

    dueDate: z.string().datetime().optional().nullable(),
    note: z.string().max(2000).optional().nullable(),

    currency: CurrencySchema.optional(),
    visibility: VisibilitySchema.optional(),

    ownerUserId: z.string().optional().nullable(), // required when visibility PRIVATE
    status: DebtStatusSchema.optional(),
});

export const UpdateDebtSchema = z.object({
    kind: DebtKindSchema.optional(),
    principal: z.number().finite().optional(),
    remaining: z.number().finite().optional(),
    counterparty: z.string().trim().min(1).max(200).optional(),

    dueDate: z.string().datetime().optional().nullable(),
    note: z.string().max(2000).optional().nullable(),

    currency: CurrencySchema.optional(),
    visibility: VisibilitySchema.optional(),
    ownerUserId: z.string().optional().nullable(),

    status: DebtStatusSchema.optional(),
});

export const ListDebtsQuerySchema = z.object({
    kind: DebtKindSchema.optional(),
    status: DebtStatusSchema.optional(),
    visibility: VisibilitySchema.optional(),

    dueFrom: z.string().datetime().optional(),
    dueTo: z.string().datetime().optional(),

    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
});