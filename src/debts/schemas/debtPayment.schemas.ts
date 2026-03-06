// src/debts/schemas/debtPayment.schemas.ts

import { z } from "zod";

export const CurrencySchema = z.enum(["MXN", "USD"]);

export const CreateDebtPaymentSchema = z.object({
    amount: z.number().finite(),
    paidAt: z.string().datetime().optional(),
    note: z.string().max(2000).optional().nullable(),

    accountId: z.string().min(1),
    categoryId: z.string().optional().nullable(),

    scheduleId: z.string().optional().nullable(),
});