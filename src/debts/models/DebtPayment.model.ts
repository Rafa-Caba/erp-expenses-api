// src/debts/models/DebtPayment.model.ts

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { applyToJsonTransform } from "@/src/shared/models/toJson";
import type { CurrencyCode } from "@/src/shared/types/common";

const DebtPaymentSchema = new Schema(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

        debtId: { type: Schema.Types.ObjectId, ref: "Debt", required: true, index: true },

        amount: { type: Number, required: true },

        currency: {
            type: String,
            required: true,
            enum: ["MXN", "USD"] satisfies CurrencyCode[],
            default: "MXN" satisfies CurrencyCode,
            index: true,
        },

        paidAt: { type: Date, required: true, index: true },

        note: { type: String, default: null, maxlength: 2000 },

        /**
         * Auto transaction link (created by our service)
         */
        transactionId: { type: Schema.Types.ObjectId, ref: "Transaction", default: null, index: true },

        accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true, index: true },
        categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },

        createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

DebtPaymentSchema.index({ workspaceId: 1, debtId: 1, paidAt: -1, createdAt: -1, _id: -1 });

applyToJsonTransform(DebtPaymentSchema);

export type DebtPaymentDoc = InferSchemaType<typeof DebtPaymentSchema>;

export const DebtPaymentModel: Model<DebtPaymentDoc> =
    mongoose.models.DebtPayment || mongoose.model<DebtPaymentDoc>("DebtPayment", DebtPaymentSchema);