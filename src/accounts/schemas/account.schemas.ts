// src/accounts/schemas/account.schemas.ts

import { z } from "zod";

const ObjectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

export const CurrencySchema = z.enum(["MXN", "USD"]);
export const AccountTypeSchema = z.enum(["CASH", "BANK", "CREDIT_CARD"]);

export const CreateAccountSchema = z.object({
    name: z.string().trim().min(2).max(120),
    type: AccountTypeSchema,
    currency: CurrencySchema.default("MXN"),
    initialBalance: z.number().finite().default(0),
    note: z.string().trim().max(2000).nullable().optional(),
});

export const UpdateAccountSchema = z.object({
    name: z.string().trim().min(2).max(120).optional(),
    type: AccountTypeSchema.optional(),
    currency: CurrencySchema.optional(),
    note: z.string().trim().max(2000).nullable().optional(),
});

export const AccountsListQuerySchema = z.object({
    includeInactive: z.coerce.boolean().optional().default(false),
});

export const AccountIdParamsSchema = z.object({
    workspaceId: ObjectIdSchema,
    accountId: ObjectIdSchema,
});