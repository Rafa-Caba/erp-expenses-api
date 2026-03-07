// // src/transactions/models/TransactionLine.model.ts

// import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
// import { applyToJsonTransform } from "@/src/shared/models/toJson";
// import type { CurrencyCode } from "@/src/shared/types/common";
// import type { TransactionLineType } from "@/src/shared/types/finance";

// const TransactionLineSchema = new Schema(
//     {
//         workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

//         transactionId: { type: Schema.Types.ObjectId, ref: "Transaction", required: true, index: true },

//         accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true, index: true },

//         /**
//          * Signed delta:
//          * - expense line: negative
//          * - income line: positive
//          * - transfer: negative on source account, positive on destination account
//          */
//         delta: { type: Number, required: true },

//         currency: {
//             type: String,
//             required: true,
//             enum: ["MXN", "USD"] satisfies CurrencyCode[],
//             default: "MXN" satisfies CurrencyCode,
//             index: true,
//         },

//         categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },

//         lineType: {
//             type: String,
//             required: true,
//             enum: ["NORMAL", "FEE"] satisfies TransactionLineType[],
//             default: "NORMAL" satisfies TransactionLineType,
//             index: true,
//         },

//         note: { type: String, default: null },

//         createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
//         updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
//     },
//     { timestamps: true }
// );

// TransactionLineSchema.index({ workspaceId: 1, transactionId: 1 });
// TransactionLineSchema.index({ workspaceId: 1, accountId: 1, transactionId: 1 });
// TransactionLineSchema.index({ workspaceId: 1, categoryId: 1, transactionId: 1 });

// applyToJsonTransform(TransactionLineSchema);

// export type TransactionLineDoc = InferSchemaType<typeof TransactionLineSchema>;

// export const TransactionLineModel: Model<TransactionLineDoc> =
//     mongoose.models.TransactionLine || mongoose.model<TransactionLineDoc>("TransactionLine", TransactionLineSchema);