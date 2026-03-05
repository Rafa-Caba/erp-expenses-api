// src/transactions/services/transactions.service.ts

import mongoose from "mongoose";
import { TransactionModel } from "@/src/transactions/models/Transaction.model";
import { TransactionLineModel } from "@/src/transactions/models/TransactionLine.model";
import type { TransactionType, TransactionLineType, Visibility } from "@/src/shared/types/finance";
import type { WorkspaceKind, WorkspaceRole } from "@/src/types/express";
import { buildVisibilityMatchWithRequested, canMutateEntity } from "@/src/shared/security/visibility";

type AccessContext = {
    actorUserId: string;
    workspaceKind: WorkspaceKind;
    role: WorkspaceRole;
};

type AttachmentInput = {
    url: string;
    publicId: string;
    mimeType: string;
    size: number;
};

type LineInput = {
    accountId: string;
    delta: number;
    currency: "MXN" | "USD";
    categoryId?: string | null;
    lineType: TransactionLineType;
    note?: string | null;
};

type UpdatePatch = Partial<{
    type: TransactionType;
    date: Date;
    currency: "MXN" | "USD";
    visibility: Visibility;
    note: string | null;
    lines: LineInput[];

    // header extras
    tags: string[];
    ownerUserId: string | null;
    debtId: string | null;
    attachments: AttachmentInput[];
}>;

function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

function toObjectId(id: string, label: string): mongoose.Types.ObjectId {
    if (!mongoose.isValidObjectId(id)) {
        const e = new Error(`Invalid ${label}`);
        (e as { status?: number }).status = 400;
        throw e;
    }
    return new mongoose.Types.ObjectId(id);
}

function assertAllLinesMatchCurrency(txCurrency: "MXN" | "USD", lines: LineInput[]) {
    for (const l of lines) {
        if (l.currency !== txCurrency) {
            const e = new Error("All transaction lines must match the transaction currency");
            (e as { status?: number }).status = 400;
            throw e;
        }
    }
}

function normalizeTags(tags: string[]): string[] {
    const cleaned = tags
        .map((t) => String(t ?? "").trim())
        .filter((t) => t.length > 0)
        .slice(0, 50);

    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of cleaned) {
        const key = t.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            out.push(t);
        }
    }
    return out;
}

function computeTotals(type: TransactionType, lines: LineInput[]) {
    const sumDelta = round2(lines.reduce((acc, l) => acc + l.delta, 0));

    const normalPos = round2(
        lines
            .filter((l) => l.lineType === "NORMAL" && l.delta > 0)
            .reduce((a, l) => a + l.delta, 0)
    );

    const feeNegAbs = round2(
        lines
            .filter((l) => l.lineType === "FEE" && l.delta < 0)
            .reduce((a, l) => a + Math.abs(l.delta), 0)
    );

    const feePos = round2(
        lines
            .filter((l) => l.lineType === "FEE" && l.delta > 0)
            .reduce((a, l) => a + l.delta, 0)
    );

    if (type === "TRANSFER") {
        const transferAmount = normalPos;
        const feeAmount = round2(feeNegAbs - feePos);
        const expectedSumDelta = round2(-feeAmount);

        const hasNormalIn = transferAmount > 0;
        const hasAnyOut = lines.some((l) => l.delta < 0);

        if (!hasNormalIn || !hasAnyOut) {
            const e = new Error("Invalid TRANSFER: requires positive NORMAL line(s) and at least one negative line");
            (e as { status?: number }).status = 400;
            throw e;
        }

        if (sumDelta !== expectedSumDelta) {
            const e = new Error("Invalid TRANSFER: sum of deltas must equal -feeAmount (0 if no fees)");
            (e as { status?: number }).status = 400;
            throw e;
        }

        const totalAmount = round2(transferAmount + feeAmount);
        return { totalAmount, transferAmount, feeAmount };
    }

    if (type === "INCOME") {
        if (sumDelta <= 0) {
            const e = new Error("Invalid INCOME: sum of deltas must be positive");
            (e as { status?: number }).status = 400;
            throw e;
        }
        return { totalAmount: round2(sumDelta), transferAmount: null, feeAmount: null };
    }

    if (type === "EXPENSE") {
        if (sumDelta >= 0) {
            const e = new Error("Invalid EXPENSE: sum of deltas must be negative");
            (e as { status?: number }).status = 400;
            throw e;
        }
        return { totalAmount: round2(Math.abs(sumDelta)), transferAmount: null, feeAmount: null };
    }

    // ADJUSTMENT / DEBT_PAYMENT
    return { totalAmount: round2(Math.abs(sumDelta)), transferAmount: null, feeAmount: null };
}

export async function createTransaction(params: {
    workspaceId: string;
    access: AccessContext;
    type: TransactionType;
    date: Date;
    currency: "MXN" | "USD";
    visibility: Visibility;
    note: string | null;
    lines: LineInput[];

    // header extras
    tags?: string[];
    ownerUserId?: string | null;
    debtId?: string | null;
    attachments?: AttachmentInput[];
}) {
    assertAllLinesMatchCurrency(params.currency, params.lines);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const totals = computeTotals(params.type, params.lines);

        const workspaceObjectId = toObjectId(params.workspaceId, "workspaceId");
        const actorObjectId = toObjectId(params.access.actorUserId, "actorUserId");

        const ownerUserObjectId =
            params.ownerUserId === undefined || params.ownerUserId === null
                ? null
                : toObjectId(params.ownerUserId, "ownerUserId");

        const debtObjectId =
            params.debtId === undefined || params.debtId === null ? null : toObjectId(params.debtId, "debtId");

        const tags = params.tags ? normalizeTags(params.tags) : [];
        const attachments = Array.isArray(params.attachments) ? params.attachments : [];

        const txDocs = await TransactionModel.create(
            [
                {
                    workspaceId: workspaceObjectId,
                    type: params.type,
                    date: params.date,
                    currency: params.currency,
                    visibility: params.visibility,

                    ownerUserId: ownerUserObjectId,
                    debtId: debtObjectId,

                    tags,
                    note: params.note ?? null,
                    attachments,

                    totalAmount: totals.totalAmount,
                    transferAmount: totals.transferAmount,
                    feeAmount: totals.feeAmount,

                    isDeleted: false,
                    deletedAt: null,

                    createdByUserId: actorObjectId,
                    updatedByUserId: null,
                },
            ],
            { session }
        );

        const createdTx = txDocs[0];

        await TransactionLineModel.insertMany(
            params.lines.map((l) => ({
                workspaceId: workspaceObjectId,
                transactionId: createdTx._id,
                accountId: toObjectId(l.accountId, "accountId"),
                delta: l.delta,
                currency: l.currency,
                categoryId: l.categoryId ? toObjectId(l.categoryId, "categoryId") : null,
                lineType: l.lineType,
                note: l.note ?? null,
                createdByUserId: actorObjectId,
                updatedByUserId: null,
            })),
            { session }
        );

        await session.commitTransaction();
        return createdTx;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

export async function getTransactionWithLines(params: {
    workspaceId: string;
    transactionId: string;
    access: AccessContext;
}) {
    const visibilityMatch = buildVisibilityMatchWithRequested(
        {
            workspaceKind: params.access.workspaceKind,
            role: params.access.role,
            actorUserId: params.access.actorUserId,
        },
        undefined
    );

    const tx = await TransactionModel.findOne({
        _id: toObjectId(params.transactionId, "transactionId"),
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: false,
        ...visibilityMatch,
    });

    if (!tx) return null;

    const lines = await TransactionLineModel.find({
        transactionId: toObjectId(params.transactionId, "transactionId"),
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
    }).sort({ createdAt: 1, _id: 1 });

    return { tx, lines };
}

export async function listTransactions(params: {
    workspaceId: string;
    access: AccessContext;

    from?: Date;
    to?: Date;
    type?: TransactionType;
    accountId?: string;
    categoryId?: string;
    visibility?: Visibility;

    // optional header filters
    tag?: string;
    ownerUserId?: string;
    debtId?: string;

    page: number;
    limit: number;
}) {
    const visibilityMatch = buildVisibilityMatchWithRequested(
        {
            workspaceKind: params.access.workspaceKind,
            role: params.access.role,
            actorUserId: params.access.actorUserId,
        },
        params.visibility
    );

    const workspaceObjectId = toObjectId(params.workspaceId, "workspaceId");

    const match: Record<string, unknown> = {
        workspaceId: workspaceObjectId,
        isDeleted: false,
        ...visibilityMatch,
    };

    if (params.type) match.type = params.type;

    if (params.from || params.to) {
        const dateMatch: Record<string, Date> = {};
        if (params.from) dateMatch.$gte = params.from;
        if (params.to) dateMatch.$lte = params.to;
        match.date = dateMatch;
    }

    if (params.tag) match.tags = params.tag;
    if (params.ownerUserId) match.ownerUserId = toObjectId(params.ownerUserId, "ownerUserId");
    if (params.debtId) match.debtId = toObjectId(params.debtId, "debtId");

    if (params.accountId || params.categoryId) {
        const lineMatch: Record<string, unknown> = { workspaceId: workspaceObjectId };
        if (params.accountId) lineMatch.accountId = toObjectId(params.accountId, "accountId");
        if (params.categoryId) lineMatch.categoryId = toObjectId(params.categoryId, "categoryId");

        const txIds = await TransactionLineModel.distinct("transactionId", lineMatch);

        if (txIds.length === 0) {
            return { items: [], page: params.page, limit: params.limit, total: 0, pages: 0 };
        }

        match._id = { $in: txIds };
    }

    const safeLimit = Math.max(1, Math.min(200, params.limit));
    const safePage = Math.max(1, params.page);
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
        TransactionModel.find(match)
            .sort({ date: -1, createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(safeLimit),
        TransactionModel.countDocuments(match),
    ]);

    return {
        items,
        page: safePage,
        limit: safeLimit,
        total,
        pages: total === 0 ? 0 : Math.ceil(total / safeLimit),
    };
}

export async function updateTransaction(params: {
    workspaceId: string;
    transactionId: string;
    access: AccessContext;
    patch: UpdatePatch;
}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const visibilityMatch = buildVisibilityMatchWithRequested(
            {
                workspaceKind: params.access.workspaceKind,
                role: params.access.role,
                actorUserId: params.access.actorUserId,
            },
            undefined
        );

        const existing = await TransactionModel.findOne(
            {
                _id: toObjectId(params.transactionId, "transactionId"),
                workspaceId: toObjectId(params.workspaceId, "workspaceId"),
                isDeleted: false,
                ...visibilityMatch,
            },
            undefined,
            { session }
        );

        if (!existing) return null;

        const createdBy = String(existing.createdByUserId);
        const ctx = {
            workspaceKind: params.access.workspaceKind,
            role: params.access.role,
            actorUserId: params.access.actorUserId,
        };

        if (!canMutateEntity(ctx, createdBy)) {
            const e = new Error("Forbidden");
            (e as { status?: number }).status = 403;
            throw e;
        }

        const nextType = params.patch.type ?? (existing.type as TransactionType);
        const nextCurrency = params.patch.currency ?? (existing.currency as "MXN" | "USD");

        const isTypeOrCurrencyChanging =
            (params.patch.type && params.patch.type !== existing.type) ||
            (params.patch.currency && params.patch.currency !== existing.currency);

        const isReplacingLines = Array.isArray(params.patch.lines);

        if (isTypeOrCurrencyChanging && !isReplacingLines) {
            const e = new Error("Updating type/currency requires providing lines");
            (e as { status?: number }).status = 400;
            throw e;
        }

        if (isReplacingLines && params.patch.lines) {
            assertAllLinesMatchCurrency(nextCurrency, params.patch.lines);
            const totals = computeTotals(nextType, params.patch.lines);

            existing.type = nextType;
            existing.currency = nextCurrency;

            existing.totalAmount = totals.totalAmount;
            existing.transferAmount = totals.transferAmount;
            existing.feeAmount = totals.feeAmount;

            await TransactionLineModel.deleteMany(
                {
                    workspaceId: toObjectId(params.workspaceId, "workspaceId"),
                    transactionId: toObjectId(params.transactionId, "transactionId"),
                },
                { session }
            );

            const workspaceObjectId = toObjectId(params.workspaceId, "workspaceId");
            const actorObjectId = toObjectId(params.access.actorUserId, "actorUserId");

            await TransactionLineModel.insertMany(
                params.patch.lines.map((l) => ({
                    workspaceId: workspaceObjectId,
                    transactionId: existing._id,
                    accountId: toObjectId(l.accountId, "accountId"),
                    delta: l.delta,
                    currency: l.currency,
                    categoryId: l.categoryId ? toObjectId(l.categoryId, "categoryId") : null,
                    lineType: l.lineType,
                    note: l.note ?? null,
                    createdByUserId: actorObjectId,
                    updatedByUserId: null,
                })),
                { session }
            );
        } else {
            if (params.patch.type) existing.type = params.patch.type;
            if (params.patch.currency) existing.currency = params.patch.currency;
        }

        if (params.patch.date) existing.date = params.patch.date;
        if (params.patch.visibility) existing.visibility = params.patch.visibility;
        if (params.patch.note !== undefined) existing.note = params.patch.note;

        if (params.patch.tags) existing.tags = normalizeTags(params.patch.tags);

        if (params.patch.ownerUserId !== undefined) {
            existing.ownerUserId = params.patch.ownerUserId ? toObjectId(params.patch.ownerUserId, "ownerUserId") : null;
        }

        if (params.patch.debtId !== undefined) {
            existing.debtId = params.patch.debtId ? toObjectId(params.patch.debtId, "debtId") : null;
        }

        /**
         * ✅ FIX TS2740:
         * existing.attachments is a Mongoose DocumentArray, so we mutate it instead of reassigning.
         */
        if (params.patch.attachments) {
            existing.attachments.splice(0, existing.attachments.length, ...params.patch.attachments);
        }

        existing.updatedByUserId = toObjectId(params.access.actorUserId, "actorUserId");

        await existing.save({ session });

        await session.commitTransaction();
        return existing;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

export async function softDeleteTransaction(params: {
    workspaceId: string;
    transactionId: string;
    access: AccessContext;
}) {
    const visibilityMatch = buildVisibilityMatchWithRequested(
        {
            workspaceKind: params.access.workspaceKind,
            role: params.access.role,
            actorUserId: params.access.actorUserId,
        },
        undefined
    );

    const tx = await TransactionModel.findOne({
        _id: toObjectId(params.transactionId, "transactionId"),
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: false,
        ...visibilityMatch,
    });

    if (!tx) return null;

    const createdBy = String(tx.createdByUserId);
    const ctx = {
        workspaceKind: params.access.workspaceKind,
        role: params.access.role,
        actorUserId: params.access.actorUserId,
    };

    if (!canMutateEntity(ctx, createdBy)) {
        const e = new Error("Forbidden");
        (e as { status?: number }).status = 403;
        throw e;
    }

    tx.isDeleted = true;
    tx.deletedAt = new Date();
    tx.updatedByUserId = toObjectId(params.access.actorUserId, "actorUserId");

    await tx.save();
    return tx;
}

export async function restoreTransaction(params: {
    workspaceId: string;
    transactionId: string;
    access: AccessContext;
}) {
    const visibilityMatch = buildVisibilityMatchWithRequested(
        {
            workspaceKind: params.access.workspaceKind,
            role: params.access.role,
            actorUserId: params.access.actorUserId,
        },
        undefined
    );

    const tx = await TransactionModel.findOne({
        _id: toObjectId(params.transactionId, "transactionId"),
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        ...visibilityMatch,
    });

    if (!tx) return null;

    const createdBy = String(tx.createdByUserId);
    const ctx = {
        workspaceKind: params.access.workspaceKind,
        role: params.access.role,
        actorUserId: params.access.actorUserId,
    };

    if (!canMutateEntity(ctx, createdBy)) {
        const e = new Error("Forbidden");
        (e as { status?: number }).status = 403;
        throw e;
    }

    tx.isDeleted = false;
    tx.deletedAt = null;
    tx.updatedByUserId = toObjectId(params.access.actorUserId, "actorUserId");

    await tx.save();
    return tx;
}