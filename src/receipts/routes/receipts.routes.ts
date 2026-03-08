// src/receipts/routes/receipts.routes.ts

import { Router } from "express";

import {
    createReceiptController,
    deleteReceiptController,
    getReceiptByIdController,
    getReceiptsByTransactionController,
    getReceiptsController,
    updateReceiptController,
} from "../controllers/receipts.controller";
import {
    createReceiptSchema,
    receiptParamsSchema,
    transactionReceiptParamsSchema,
    updateReceiptSchema,
    workspaceReceiptParamsSchema,
} from "../schemas/receipts.schemas";
import type {
    CreateReceiptBody,
    ReceiptParams,
    TransactionReceiptParams,
    UpdateReceiptBody,
    WorkspaceReceiptParams,
} from "../types/receipts.types";
import { uploadReceiptFile } from "@/src/middlewares/cloudinaryUploads";
import { requireWorkspaceAccess } from "@/src/middlewares/requireWorkspaceAccess";
import { requireWorkspacePermission } from "@/src/middlewares/requireWorkspacePermission";
import { validateRequest } from "@/src/middlewares/validateRequest";

const receiptRouter = Router({ mergeParams: true });

receiptRouter.use(requireWorkspaceAccess());

receiptRouter.get<WorkspaceReceiptParams>(
    "/",
    validateRequest(workspaceReceiptParamsSchema),
    requireWorkspacePermission("transactions.read"),
    getReceiptsController
);

receiptRouter.get<TransactionReceiptParams>(
    "/transaction/:transactionId",
    validateRequest(transactionReceiptParamsSchema),
    requireWorkspacePermission("transactions.read"),
    getReceiptsByTransactionController
);

receiptRouter.get<ReceiptParams>(
    "/:receiptId",
    validateRequest(receiptParamsSchema),
    requireWorkspacePermission("transactions.read"),
    getReceiptByIdController
);

receiptRouter.post<WorkspaceReceiptParams, object, CreateReceiptBody>(
    "/",
    uploadReceiptFile.single("file"),
    validateRequest(workspaceReceiptParamsSchema),
    validateRequest(createReceiptSchema),
    requireWorkspacePermission("transactions.create"),
    createReceiptController
);

receiptRouter.patch<ReceiptParams, object, UpdateReceiptBody>(
    "/:receiptId",
    uploadReceiptFile.single("file"),
    validateRequest(receiptParamsSchema),
    validateRequest(updateReceiptSchema),
    requireWorkspacePermission("transactions.update"),
    updateReceiptController
);

receiptRouter.delete<ReceiptParams>(
    "/:receiptId",
    validateRequest(receiptParamsSchema),
    requireWorkspacePermission("transactions.delete"),
    deleteReceiptController
);

export { receiptRouter };