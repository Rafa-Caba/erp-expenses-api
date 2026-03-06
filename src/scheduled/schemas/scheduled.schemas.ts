// src/scheduled/schemas/scheduled.schemas.ts

import { z } from "zod";

const ObjectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

export const VisibilitySchema = z.enum(["SHARED", "PRIVATE"]);
export const CurrencySchema = z.enum(["MXN", "USD"]);

export const ScheduledItemStatusSchema = z.enum(["ACTIVE", "PAUSED", "CANCELED"]);
export const ScheduledItemKindSchema = z.enum(["BILL", "INCOME"]);
export const ScheduledItemTxTypeOnPaySchema = z.enum(["EXPENSE", "INCOME"]);

// ✅ Fixed: use a unique discriminator key (typeMode)
export const RecurrenceSchema = z.discriminatedUnion("typeMode", [
    z.object({
        typeMode: z.literal("WEEKLY"),
        type: z.literal("WEEKLY"),
        intervalWeeks: z.number().int().min(1),
        byWeekday: z.array(z.number().int().min(0).max(6)).min(1),
    }),
    z.object({
        typeMode: z.literal("MONTHLY_DAY_OF_MONTH"),
        type: z.literal("MONTHLY"),
        mode: z.literal("DAY_OF_MONTH"),
        intervalMonths: z.number().int().min(1),
        day: z.number().int().min(1).max(31),
        clamp: z.boolean(),
    }),
    z.object({
        typeMode: z.literal("MONTHLY_NTH_WEEKDAY"),
        type: z.literal("MONTHLY"),
        mode: z.literal("NTH_WEEKDAY"),
        intervalMonths: z.number().int().min(1),
        nth: z.number().int().min(1).max(5),
        weekday: z.number().int().min(0).max(6),
    }),
    z.object({
        typeMode: z.literal("CUSTOM_INTERVAL"),
        type: z.literal("CUSTOM_INTERVAL"),
        unit: z.enum(["day", "week", "month"]),
        interval: z.number().int().min(1),
    }),
]);

export const CreateScheduledItemSchema = z.object({
    title: z.string().trim().min(1).max(200),
    kind: ScheduledItemKindSchema,
    txTypeOnPay: ScheduledItemTxTypeOnPaySchema,

    amount: z.number().finite(),
    currency: CurrencySchema.default("MXN"),

    defaultCategoryId: ObjectIdSchema.nullable().optional(),
    note: z.string().trim().max(4000).nullable().optional(),

    startDate: z.string().datetime(),
    recurrence: RecurrenceSchema,

    endDate: z.string().datetime().nullable().optional(),
    maxOccurrences: z.number().int().min(1).nullable().optional(),

    status: ScheduledItemStatusSchema.default("ACTIVE"),

    visibility: VisibilitySchema.default("SHARED"),
    ownerUserId: ObjectIdSchema.nullable().optional(),
});

export const UpdateScheduledItemSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    kind: ScheduledItemKindSchema.optional(),
    txTypeOnPay: ScheduledItemTxTypeOnPaySchema.optional(),

    amount: z.number().finite().optional(),
    currency: CurrencySchema.optional(),

    defaultCategoryId: ObjectIdSchema.nullable().optional(),
    note: z.string().trim().max(4000).nullable().optional(),

    startDate: z.string().datetime().optional(),
    recurrence: RecurrenceSchema.optional(),

    endDate: z.string().datetime().nullable().optional(),
    maxOccurrences: z.number().int().min(1).nullable().optional(),

    status: ScheduledItemStatusSchema.optional(),

    visibility: VisibilitySchema.optional(),
    ownerUserId: ObjectIdSchema.nullable().optional(),
});

export const ListScheduledItemsQuerySchema = z.object({
    status: ScheduledItemStatusSchema.optional(),
    visibility: VisibilitySchema.optional(),

    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const GeneratePendingQuerySchema = z.object({
    horizonDays: z.coerce.number().int().min(1).max(365).default(60),
});

export const UpcomingQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(365).default(30),
});

export const PayOccurrenceSchema = z.object({
    accountId: ObjectIdSchema,
    categoryId: ObjectIdSchema.nullable().optional(),
    note: z.string().trim().max(4000).nullable().optional(),
    paidAt: z.string().datetime().optional(),
});