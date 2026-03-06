// src/scheduled/utils/recurrenceMapper.ts

import type { RecurrenceRule } from "@/src/scheduled/types/scheduled.types";

type RawRecurrence = {
    type?: "WEEKLY" | "MONTHLY" | "CUSTOM_INTERVAL" | null;

    intervalWeeks?: number | null;
    byWeekday?: number[] | null;

    mode?: "DAY_OF_MONTH" | "NTH_WEEKDAY" | null;
    intervalMonths?: number | null;
    day?: number | null;
    clamp?: boolean | null;
    nth?: number | null;
    weekday?: number | null;

    unit?: "day" | "week" | "month" | null;
    interval?: number | null;
};

function assertPositiveInt(name: string, v: number): void {
    if (!Number.isInteger(v) || v < 1) {
        throw new Error(`${name} must be a positive integer`);
    }
}

function assertWeekdayArray(v: number[]): void {
    if (!Array.isArray(v) || v.length === 0) throw new Error("byWeekday must be a non-empty array");
    for (const x of v) {
        if (!Number.isInteger(x) || x < 0 || x > 6) throw new Error("byWeekday values must be 0-6");
    }
}

export function toRecurrenceRule(raw: RawRecurrence): RecurrenceRule {
    const type = raw.type ?? null;

    if (type === "WEEKLY") {
        const intervalWeeks = raw.intervalWeeks ?? null;
        const byWeekday = raw.byWeekday ?? null;

        if (intervalWeeks === null) throw new Error("WEEKLY requires intervalWeeks");
        if (byWeekday === null) throw new Error("WEEKLY requires byWeekday");

        assertPositiveInt("intervalWeeks", intervalWeeks);
        assertWeekdayArray(byWeekday);

        return {
            type: "WEEKLY",
            intervalWeeks,
            byWeekday,
        };
    }

    if (type === "CUSTOM_INTERVAL") {
        const unit = raw.unit ?? null;
        const interval = raw.interval ?? null;

        if (unit === null) throw new Error("CUSTOM_INTERVAL requires unit");
        if (interval === null) throw new Error("CUSTOM_INTERVAL requires interval");

        assertPositiveInt("interval", interval);

        return {
            type: "CUSTOM_INTERVAL",
            unit,
            interval,
        };
    }

    if (type === "MONTHLY") {
        const mode = raw.mode ?? null;
        const intervalMonths = raw.intervalMonths ?? null;

        if (mode === null) throw new Error("MONTHLY requires mode");
        if (intervalMonths === null) throw new Error("MONTHLY requires intervalMonths");

        assertPositiveInt("intervalMonths", intervalMonths);

        if (mode === "DAY_OF_MONTH") {
            const day = raw.day ?? null;
            const clamp = raw.clamp ?? null;

            if (day === null) throw new Error("MONTHLY DAY_OF_MONTH requires day");
            if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error("day must be 1-31");
            if (clamp === null) throw new Error("MONTHLY DAY_OF_MONTH requires clamp");

            return {
                type: "MONTHLY",
                mode: "DAY_OF_MONTH",
                intervalMonths,
                day,
                clamp,
            };
        }

        if (mode === "NTH_WEEKDAY") {
            const nth = raw.nth ?? null;
            const weekday = raw.weekday ?? null;

            if (nth === null) throw new Error("MONTHLY NTH_WEEKDAY requires nth");
            if (weekday === null) throw new Error("MONTHLY NTH_WEEKDAY requires weekday");

            if (!Number.isInteger(nth) || nth < 1 || nth > 5) throw new Error("nth must be 1-5");
            if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new Error("weekday must be 0-6");

            return {
                type: "MONTHLY",
                mode: "NTH_WEEKDAY",
                intervalMonths,
                nth,
                weekday,
            };
        }

        // exhaustive
        throw new Error("Invalid MONTHLY mode");
    }

    throw new Error("Invalid recurrence type");
}