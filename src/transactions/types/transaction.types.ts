// src/transactions/types/transaction.types.ts

import type { CurrencyCode } from "@/src/shared/types/common";
import type { TransactionLineType, TransactionType, Visibility } from "@/src/shared/types/finance";

export interface AttachmentEntity {
  url: string;
  publicId: string;
  mimeType: string;
  size: number;
}

export interface TransactionEntity {
  id: string;
  workspaceId: string;

  type: TransactionType;
  date: Date;

  currency: CurrencyCode;
  visibility: Visibility;

  ownerUserId: string | null;
  debtId: string | null;

  tags: string[];
  note: string | null;

  attachments: AttachmentEntity[];

  totalAmount: number;
  transferAmount: number | null;
  feeAmount: number | null;

  isDeleted: boolean;
  deletedAt: Date | null;

  createdByUserId: string;
  updatedByUserId: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionLineEntity {
  id: string;
  workspaceId: string;

  transactionId: string;

  accountId: string;
  categoryId: string | null;

  delta: number;
  currency: CurrencyCode;

  lineType: TransactionLineType;
  note: string | null;

  createdByUserId: string;
  updatedByUserId: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionWithLinesEntity {
  transaction: TransactionEntity;
  lines: TransactionLineEntity[];
}