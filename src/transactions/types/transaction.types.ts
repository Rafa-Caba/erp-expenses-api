// src/transactions/types/transaction.types.ts

import type {
  CurrencyCode,
  TransactionDirection,
  TransactionType,
  Visibility,
} from "@/src/shared/types/common";

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
  direction: TransactionDirection;

  amount: number;
  currency: CurrencyCode;

  date: Date;

  accountId: string;
  categoryId: string | null;

  tags: string[];
  note: string | null;

  visibility: Visibility;
  ownerUserId: string | null;

  debtId: string | null;

  transferToAccountId: string | null;
  transferGroupId: string | null;

  attachments: AttachmentEntity[];

  createdByUserId: string;
  updatedByUserId: string | null;

  createdAt: Date;
  updatedAt: Date;
}
