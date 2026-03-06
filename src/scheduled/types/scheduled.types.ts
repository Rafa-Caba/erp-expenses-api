// src/scheduled/types/scheduled.types.ts

import type { Visibility, TransactionType } from "@/src/shared/types/finance";

export type CurrencyCode = "MXN" | "USD";

export type ScheduledItemStatus = "ACTIVE" | "PAUSED" | "CANCELED";
export type ScheduledItemKind = "BILL" | "INCOME";

export type RecurrenceRule =
    | {
        type: "WEEKLY";
        intervalWeeks: number; // >= 1
        byWeekday: number[]; // 0-6 (Sun-Sat)
    }
    | {
        type: "MONTHLY";
        mode: "DAY_OF_MONTH";
        intervalMonths: number; // >= 1
        day: number; // 1-31
        clamp: boolean; // if 31 and month has 30 => clamp to last day
    }
    | {
        type: "MONTHLY";
        mode: "NTH_WEEKDAY";
        intervalMonths: number; // >= 1
        nth: number; // 1-5
        weekday: number; // 0-6
    }
    | {
        type: "CUSTOM_INTERVAL";
        unit: "day" | "week" | "month";
        interval: number; // >= 1
    };

export type ScheduledOccurrenceStatus = "PENDING" | "PAID" | "SKIPPED" | "CANCELED";

export type ScheduledItemTxTypeOnPay = Extract<TransactionType, "EXPENSE" | "INCOME">;

export type ScheduledItemCreateInput = {
    title: string;
    kind: ScheduledItemKind;
    txTypeOnPay: ScheduledItemTxTypeOnPay;

    amount: number;
    currency: CurrencyCode;

    defaultCategoryId?: string | null;
    note?: string | null;

    startDate: Date;
    recurrence: RecurrenceRule;

    endDate?: Date | null;
    maxOccurrences?: number | null;

    status: ScheduledItemStatus;

    visibility: Visibility;
    ownerUserId: string | null; // required if PRIVATE
};

export type ScheduledItemUpdatePatch = Partial<{
    title: string;
    kind: ScheduledItemKind;
    txTypeOnPay: ScheduledItemTxTypeOnPay;

    amount: number;
    currency: CurrencyCode;

    defaultCategoryId: string | null;
    note: string | null;

    startDate: Date;
    recurrence: RecurrenceRule;

    endDate: Date | null;
    maxOccurrences: number | null;

    status: ScheduledItemStatus;

    visibility: Visibility;
    ownerUserId: string | null;
}>;

export type OccurrencePayInput = {
    accountId: string;
    categoryId?: string | null;
    note?: string | null;
    paidAt?: Date;
};