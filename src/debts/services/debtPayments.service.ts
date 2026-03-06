// src/debts/services/debtPayments.service.ts

import mongoose from "mongoose";
import { DebtModel } from "@/src/debts/models/Debt.model";
import { DebtPaymentModel } from "@/src/debts/models/DebtPayment.model";
import { DebtScheduleModel } from "@/src/debts/models/DebtSchedule.model";
import { createTransaction } from "@/src/transactions/services/transactions.service";
import type { TransactionType, Visibility } from "@/src/shared/types/finance";
import type { WorkspaceKind, WorkspaceRole } from "@/src/types/express";

type AccessContext = {
    actorUserId: string;
    workspaceKind: WorkspaceKind;
    role: WorkspaceRole;
};

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

/**
 * Payment rules:
 * - SHARED => any workspace member can create payment
 * - PRIVATE => only ownerUserId can create payment
 */
function canCreateDebtPayment(input: {
    actorUserId: string;
    visibility: Visibility;
    ownerUserId: string | null;
}) {
    if (input.visibility === "PRIVATE") return input.ownerUserId === input.actorUserId;
    return true;
}

export async function createDebtPayment(params: {
    workspaceId: string;
    debtId: string;
    access: AccessContext;

    amount: number;
    paidAt: Date;
    note: string | null;

    accountId: string;
    categoryId: string | null;

    scheduleId: string | null;
}) {
    const amount = round2(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        const e = new Error("amount must be a positive number");
        (e as { status?: number }).status = 400;
        throw e;
    }

    const debt = await DebtModel.findOne({
        _id: toObjectId(params.debtId, "debtId"),
        workspaceId: toObjectId(params.workspaceId, "workspaceId"),
        isDeleted: false,
    });

    if (!debt) {
        const e = new Error("Debt not found");
        (e as { status?: number }).status = 404;
        throw e;
    }

    const ownerUserId = debt.ownerUserId ? String(debt.ownerUserId) : null;

    if (!canCreateDebtPayment({ actorUserId: params.access.actorUserId, visibility: debt.visibility, ownerUserId })) {
        const e = new Error("Forbidden");
        (e as { status?: number }).status = 403;
        throw e;
    }

    // If scheduleId provided, validate it belongs to the same debt/workspace
    let scheduleDoc: any | null = null;

    if (params.scheduleId) {
        scheduleDoc = await DebtScheduleModel.findOne({
            _id: toObjectId(params.scheduleId, "scheduleId"),
            workspaceId: toObjectId(params.workspaceId, "workspaceId"),
            debtId: toObjectId(params.debtId, "debtId"),
        });

        if (!scheduleDoc) {
            const e = new Error("DebtSchedule not found for given scheduleId");
            (e as { status?: number }).status = 404;
            throw e;
        }

        if (scheduleDoc.status === "paid") {
            const e = new Error("DebtSchedule already paid");
            (e as { status?: number }).status = 409;
            throw e;
        }
    }

    // Determine Transaction.type based on Debt.kind
    const txType: TransactionType = debt.kind === "I_OWE" ? "EXPENSE" : "INCOME";
    const delta = txType === "EXPENSE" ? -amount : amount;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1) Create Transaction (ledger) — visibility mirrors the debt
        const tx = await createTransaction({
            workspaceId: params.workspaceId,
            access: params.access,
            type: txType,
            date: params.paidAt,
            currency: debt.currency,
            visibility: debt.visibility,
            note: params.note ?? null,
            ownerUserId: debt.visibility === "PRIVATE" ? ownerUserId : null,
            debtId: String(debt._id),
            tags: [],
            attachments: [],
            lines: [
                {
                    accountId: params.accountId,
                    delta,
                    currency: debt.currency,
                    categoryId: params.categoryId ?? null,
                    lineType: "NORMAL",
                    note: params.note ?? null,
                },
            ],
        });

        // 2) Create DebtPayment
        const paymentDocs = await DebtPaymentModel.create(
            [
                {
                    workspaceId: toObjectId(params.workspaceId, "workspaceId"),
                    debtId: toObjectId(params.debtId, "debtId"),
                    amount,
                    currency: debt.currency,
                    paidAt: params.paidAt,
                    note: params.note ?? null,
                    transactionId: tx._id,
                    accountId: toObjectId(params.accountId, "accountId"),
                    categoryId: params.categoryId ? toObjectId(params.categoryId, "categoryId") : null,
                    createdByUserId: toObjectId(params.access.actorUserId, "actorUserId"),
                    updatedByUserId: null,
                },
            ],
            { session }
        );

        const payment = paymentDocs[0];

        // 3) Update debt.remaining + status (overpayment allowed)
        const nextRemaining = round2(debt.remaining - amount);
        debt.remaining = nextRemaining <= 0 ? 0 : nextRemaining;

        if (debt.remaining === 0 && debt.status !== "CANCELED") {
            debt.status = "PAID";
        }

        debt.updatedByUserId = toObjectId(params.access.actorUserId, "actorUserId");
        await debt.save({ session });

        // 4) Mark schedule as paid if scheduleId provided
        let updatedSchedule: any | null = null;

        if (scheduleDoc) {
            scheduleDoc.status = "paid";
            scheduleDoc.paidAt = params.paidAt;
            scheduleDoc.paidTransactionId = tx._id;
            scheduleDoc.debtPaymentId = payment._id;
            scheduleDoc.updatedByUserId = toObjectId(params.access.actorUserId, "actorUserId");

            await scheduleDoc.save({ session });
            updatedSchedule = scheduleDoc;
        }

        await session.commitTransaction();
        return { payment, transaction: tx, debt, schedule: updatedSchedule };
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}