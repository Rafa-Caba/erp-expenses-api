// // src/summary/services/summary.service.ts

// import mongoose from "mongoose";
// // import { TransactionLineModel } from "@/src/transactions/models/TransactionLine.model";
// import { TransactionModel } from "@/src/transactions/models/Transaction.model";
// // import type { WorkspaceKind, WorkspaceRole } from "@/src/shared/security/visibility";
// import { buildVisibilityMatchWithRequested } from "@/src/shared/security/visibility";

// export async function getWorkspaceSummary(params: {
//     workspaceId: string;

//     actorUserId: string;
//     workspaceKind: WorkspaceKind;
//     role: WorkspaceRole;
// }) {
//     const workspaceObjectId = new mongoose.Types.ObjectId(params.workspaceId);

//     const visibilityMatch = buildVisibilityMatchWithRequested(
//         {
//             workspaceKind: params.workspaceKind,
//             role: params.role,
//             actorUserId: params.actorUserId,
//         },
//         undefined
//     );

//     // Active & visible tx ids
//     const activeTxIds = await TransactionModel.distinct("_id", {
//         workspaceId: workspaceObjectId,
//         isDeleted: false,
//         ...visibilityMatch,
//     });

//     // Balances by account (visible ledger only)
//     const balances = await TransactionLineModel.aggregate([
//         { $match: { workspaceId: workspaceObjectId, transactionId: { $in: activeTxIds } } },
//         {
//             $group: {
//                 _id: "$accountId",
//                 balance: { $sum: "$delta" },
//                 currency: { $first: "$currency" },
//             },
//         },
//         { $sort: { balance: -1 } },
//     ]);

//     // Quick totals (last 30 days, visible only)
//     const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

//     const last30 = await TransactionModel.find({
//         workspaceId: workspaceObjectId,
//         isDeleted: false,
//         date: { $gte: from },
//         ...visibilityMatch,
//     }).select("_id type totalAmount feeAmount transferAmount");

//     const totals = {
//         income: 0,
//         expense: 0,
//         transferAmount: 0,
//         fees: 0,
//         adjustments: 0,
//     };

//     for (const t of last30) {
//         const type = (t as any).type as string;
//         const totalAmount = Number((t as any).totalAmount ?? 0);
//         const feeAmount = Number((t as any).feeAmount ?? 0);
//         const transferAmount = Number((t as any).transferAmount ?? 0);

//         if (type === "INCOME") totals.income += totalAmount;
//         else if (type === "EXPENSE") totals.expense += totalAmount;
//         else if (type === "TRANSFER") {
//             totals.transferAmount += transferAmount;
//             totals.fees += feeAmount;
//         } else if (type === "ADJUSTMENT") totals.adjustments += totalAmount;
//     }

//     return {
//         windowDays: 30,
//         balancesByAccount: balances.map((b) => ({
//             accountId: String(b._id),
//             balance: b.balance,
//             currency: b.currency,
//         })),
//         totalsLast30Days: totals,
//     };
// }