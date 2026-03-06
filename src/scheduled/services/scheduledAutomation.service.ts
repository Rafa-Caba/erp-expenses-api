// src/scheduled/services/scheduledAutomation.service.ts

import mongoose from "mongoose";
import { ScheduledItemModel } from "@/src/scheduled/models/ScheduledItem.model";
import { ScheduledOccurrenceModel } from "@/src/scheduled/models/ScheduledOccurrence.model";
import type { ScheduledAccessContext } from "@/src/scheduled/services/scheduled.security";
import { buildScheduledVisibilityMatchWithRequested } from "@/src/scheduled/services/scheduled.security";
import { computeNextRunAt } from "@/src/scheduled/utils/recurrence";
import { getScheduleTimeZone, toDateKey } from "@/src/scheduled/utils/dateKey";
import type { Visibility } from "@/src/shared/types/finance";
import { toRecurrenceRule } from "../utils/recurrenceMapper";

function toObjectId(id: string, label: string): mongoose.Types.ObjectId {
    if (!mongoose.isValidObjectId(id)) {
        const e = new Error(`Invalid ${label}`);
        (e as { status?: number }).status = 400;
        throw e;
    }
    return new mongoose.Types.ObjectId(id);
}

function startOfDayUTC(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function addDaysUTC(d: Date, days: number): Date {
    const out = new Date(d.getTime());
    out.setUTCDate(out.getUTCDate() + days);
    return out;
}

export async function generatePendingOccurrences(params: {
    workspaceId: string;
    access: ScheduledAccessContext;
    horizonDays: number;
    visibility?: Visibility; // optional filter
}) {
    const tz = getScheduleTimeZone();
    const now = startOfDayUTC(new Date());
    const horizonEnd = addDaysUTC(now, params.horizonDays);

    const visibilityMatch = buildScheduledVisibilityMatchWithRequested({
        actorUserId: params.access.actorUserId,
        requested: params.visibility,
    });

    const items = await ScheduledItemModel.find({
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: false,
        status: "ACTIVE",
        ...visibilityMatch,
        nextRunAt: { $lte: horizonEnd },
    }).sort({ nextRunAt: 1, _id: 1 });

    let totalUpserts = 0;

    for (const item of items) {
        // maxOccurrences enforcement (cheap per item)
        const max = item.maxOccurrences ?? null;
        let existingCount = 0;

        if (max !== null) {
            existingCount = await ScheduledOccurrenceModel.countDocuments({
                scheduledItemId: item._id,
            });
            if (existingCount >= max) {
                // item reached cap, keep nextRunAt as-is but you may want to PAUSE automatically (not doing that now)
                continue;
            }
        }

        const batchOps: Array<{
            updateOne: {
                filter: Record<string, unknown>;
                update: Record<string, unknown>;
                upsert: boolean;
            };
        }> = [];

        let runAt = item.nextRunAt;
        let produced = 0;

        const rule = toRecurrenceRule(item.recurrence);

        while (runAt <= horizonEnd) {
            if (item.endDate && runAt > item.endDate) break;

            if (max !== null && existingCount + produced >= max) break;

            const dateKey = toDateKey(runAt, tz);

            batchOps.push({
                updateOne: {
                    filter: { scheduledItemId: item._id, dateKey },
                    update: {
                        $setOnInsert: {
                            workspaceId: item.workspaceId,
                            scheduledItemId: item._id,
                            runAt,
                            dateKey,
                            status: "PENDING",
                            paidAt: null,
                            paidByUserId: null,
                            transactionId: null,
                            accountId: null,
                            categoryId: null,
                            note: null,
                            createdByUserId: new mongoose.Types.ObjectId(params.access.actorUserId),
                            updatedByUserId: null,
                        },
                    },
                    upsert: true,
                },
            });

            produced += 1;
            runAt = computeNextRunAt(runAt, rule);
        }

        if (batchOps.length === 0) continue;

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const bulk = await ScheduledOccurrenceModel.bulkWrite(batchOps, { session });

            // advance nextRunAt to the first not-generated
            item.nextRunAt = runAt;
            item.updatedByUserId = new mongoose.Types.ObjectId(params.access.actorUserId);
            await item.save({ session });

            await session.commitTransaction();

            totalUpserts += (bulk.upsertedCount ?? 0);
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    return { generated: totalUpserts };
}