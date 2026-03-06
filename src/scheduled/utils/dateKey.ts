// src/scheduled/utils/dateKey.ts

/**
 * IMPORTANT:
 * dateKey must be produced in the workspace timezone.
 * We keep it configurable via env to avoid guessing.
 *
 * Suggested default: America/Mexico_City
 */
export function getScheduleTimeZone(): string {
    return process.env.SCHEDULE_TZ_DEFAULT?.trim() || "America/Mexico_City";
}

export function toDateKey(input: Date, timeZone: string): string {
    // YYYY-MM-DD in target time zone
    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    // en-CA returns "YYYY-MM-DD"
    return fmt.format(input);
}