// src/accounts/types/account.types.ts

import type {
  AccountType,
  CurrencyCode,
  Visibility,
} from "@/src/shared/types/common";

export interface AccountEntity {
  id: string;
  workspaceId: string;

  name: string;
  type: AccountType;
  currency: CurrencyCode;

  startingBalance: number;
  isActive: boolean;

  visibility: Visibility;
  ownerUserId: string | null;

  creditLimit: number | null;
  statementDay: number | null;
  dueDay: number | null;

  createdByUserId: string;
  updatedByUserId: string | null;

  createdAt: Date;
  updatedAt: Date;
}
