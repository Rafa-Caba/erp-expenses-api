// src/transactions/schemas/transaction.schemas.ts

import { z } from "zod";

const ObjectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

export const TransactionTypeSchema = z.enum(["INCOME", "EXPENSE", "TRANSFER", "ADJUSTMENT", "DEBT_PAYMENT"]);
export const VisibilitySchema = z.enum(["SHARED", "PRIVATE"]);
export const CurrencySchema = z.enum(["MXN", "USD"]);
export const LineTypeSchema = z.enum(["NORMAL", "FEE"]);

export const AttachmentInputSchema = z.object({
    url: z.string().trim().min(1),
    publicId: z.string().trim().min(1),
    mimeType: z.string().trim().min(1),
    size: z.number().int().min(0),
});

export const TransactionLineInputSchema = z.object({
    accountId: ObjectIdSchema,
    delta: z.number().finite().refine((n) => n !== 0, "delta cannot be 0"),
    currency: CurrencySchema.default("MXN"),
    categoryId: ObjectIdSchema.nullable().optional(),
    lineType: LineTypeSchema.default("NORMAL"),
    note: z.string().trim().max(2000).nullable().optional(),
});

export const CreateTransactionSchema = z.object({
    type: TransactionTypeSchema,
    date: z.string().datetime().optional(), // ISO string
    currency: CurrencySchema.default("MXN"),
    visibility: VisibilitySchema.default("SHARED"),
    note: z.string().trim().max(4000).nullable().optional(),
    lines: z.array(TransactionLineInputSchema).min(1),

    // header extras
    tags: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
    ownerUserId: ObjectIdSchema.nullable().optional(),
    debtId: ObjectIdSchema.nullable().optional(),
    attachments: z.array(AttachmentInputSchema).max(20).optional(),
});

/**
 * Update rules:
 * - You may update note/visibility/date without changing lines.
 * - If changing type/currency OR if providing lines => lines required to keep ledger consistent.
 */
export const UpdateTransactionSchema = z.object({
    type: TransactionTypeSchema.optional(),
    date: z.string().datetime().optional(),
    currency: CurrencySchema.optional(),
    visibility: VisibilitySchema.optional(),
    note: z.string().trim().max(4000).nullable().optional(),
    lines: z.array(TransactionLineInputSchema).min(1).optional(),

    // header extras
    tags: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
    ownerUserId: ObjectIdSchema.nullable().optional(),
    debtId: ObjectIdSchema.nullable().optional(),
    attachments: z.array(AttachmentInputSchema).max(20).optional(),
});

export const ListTransactionsQuerySchema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    type: TransactionTypeSchema.optional(),
    accountId: ObjectIdSchema.optional(),
    categoryId: ObjectIdSchema.optional(),
    visibility: VisibilitySchema.optional(),

    // optional header filters
    tag: z.string().trim().min(1).max(60).optional(),
    ownerUserId: ObjectIdSchema.optional(),
    debtId: ObjectIdSchema.optional(),

    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
});