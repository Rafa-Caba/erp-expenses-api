// src/scheduled/utils/recurrence.ts

import type { RecurrenceRule } from "@/src/scheduled/types/scheduled.types";

function assertInt(name: string, v: number) {
    if (!Number.isInteger(v) || v <= 0) throw new Error(`${name} must be a positive integer`);
}

function clampDayOfMonth(year: number, monthIndex0: number, day: number): number {
    // monthIndex0: 0-11
    const lastDay = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
    return Math.min(day, lastDay);
}

function addDaysUTC(d: Date, days: number): Date {
    const out = new Date(d.getTime());
    out.setUTCDate(out.getUTCDate() + days);
    return out;
}

function addWeeksUTC(d: Date, weeks: number): Date {
    return addDaysUTC(d, weeks * 7);
}

function addMonthsUTC(d: Date, months: number): Date {
    const out = new Date(d.getTime());
    const y = out.getUTCFullYear();
    const m = out.getUTCMonth();
    const day = out.getUTCDate();

    // set to first of month to avoid overflow, then restore day clamped
    out.setUTCDate(1);
    out.setUTCFullYear(y);
    out.setUTCMonth(m + months);

    const ny = out.getUTCFullYear();
    const nm = out.getUTCMonth();
    const nd = clampDayOfMonth(ny, nm, day);
    out.setUTCDate(nd);
    return out;
}

function getWeekdayUTC(d: Date): number {
    // 0-6 (Sun-Sat)
    return d.getUTCDay();
}

function startOfDayUTC(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export function computeFirstRunAt(startDate: Date): Date {
    // We treat startDate as the first candidate runAt (normalized to start-of-day UTC)
    return startOfDayUTC(startDate);
}

export function computeNextRunAt(currentRunAt: Date, rule: RecurrenceRule): Date {
    const cur = startOfDayUTC(currentRunAt);

    if (rule.type === "CUSTOM_INTERVAL") {
        assertInt("interval", rule.interval);
        if (rule.unit === "day") return addDaysUTC(cur, rule.interval);
        if (rule.unit === "week") return addWeeksUTC(cur, rule.interval);
        return addMonthsUTC(cur, rule.interval);
    }

    if (rule.type === "WEEKLY") {
        assertInt("intervalWeeks", rule.intervalWeeks);
        if (!Array.isArray(rule.byWeekday) || rule.byWeekday.length === 0) {
            throw new Error("WEEKLY rule requires byWeekday");
        }
        const weekdays = Array.from(new Set(rule.byWeekday)).sort((a, b) => a - b);
        for (const w of weekdays) {
            if (w < 0 || w > 6) throw new Error("byWeekday values must be 0-6");
        }

        const curW = getWeekdayUTC(cur);

        // find next weekday in same interval week window
        for (const w of weekdays) {
            if (w > curW) {
                const diff = w - curW;
                return addDaysUTC(cur, diff);
            }
        }

        // otherwise jump intervalWeeks weeks and go to first weekday
        const firstW = weekdays[0];
        const diffToFirst = (7 - curW) + firstW;
        return addDaysUTC(cur, diffToFirst + (rule.intervalWeeks - 1) * 7);
    }

    // MONTHLY
    assertInt("intervalMonths", rule.intervalMonths);

    if (rule.mode === "DAY_OF_MONTH") {
        const nextBase = addMonthsUTC(cur, rule.intervalMonths);
        const y = nextBase.getUTCFullYear();
        const m = nextBase.getUTCMonth();

        const targetDay = rule.day;
        if (!Number.isInteger(targetDay) || targetDay < 1 || targetDay > 31) {
            throw new Error("DAY_OF_MONTH day must be 1-31");
        }

        const day = rule.clamp ? clampDayOfMonth(y, m, targetDay) : targetDay;
        return new Date(Date.UTC(y, m, day, 0, 0, 0, 0));
    }

    // NTH_WEEKDAY
    const nth = rule.nth;
    const weekday = rule.weekday;

    if (!Number.isInteger(nth) || nth < 1 || nth > 5) throw new Error("nth must be 1-5");
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new Error("weekday must be 0-6");

    const nextBase = addMonthsUTC(cur, rule.intervalMonths);
    const y = nextBase.getUTCFullYear();
    const m = nextBase.getUTCMonth();

    // Find nth weekday in that month
    const firstOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const firstWeekday = getWeekdayUTC(firstOfMonth);

    let offset = weekday - firstWeekday;
    if (offset < 0) offset += 7;

    const day = 1 + offset + (nth - 1) * 7;
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

    // if nth weekday doesn't exist, clamp to last possible occurrence in month
    if (day > lastDay) {
        // step back 7 days until within month
        const clamped = day - 7;
        if (clamped < 1) throw new Error("Invalid NTH_WEEKDAY rule");
        return new Date(Date.UTC(y, m, clamped, 0, 0, 0, 0));
    }

    return new Date(Date.UTC(y, m, day, 0, 0, 0, 0));
}