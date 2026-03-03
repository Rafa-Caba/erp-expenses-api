// src/debts/types/debt.types.ts

import type {
  CurrencyCode,
  DebtScheduleStatus,
  DebtType,
  Visibility,
} from "@/src/shared/types/common";

export type DebtFrequency = "monthly" | "biweekly";

export type DebtDueRule =
  | {
      kind: "credit_card";
      statementDay: number; // 1-31
      dueDay: number; // 1-31
    }
  | {
      kind: "loan";
      frequency: DebtFrequency;
      dayOfMonth: number; // 1-31
    }
  | {
      kind: "custom";
      note: string;
    };

export interface DebtEntity {
  id: string;
  workspaceId: string;

  name: string;
  type: DebtType;

  principal: number;
  balance: number;

  currency: CurrencyCode;

  apr: number | null;
  minPayment: number | null;

  startDate: Date;

  dueRule: DebtDueRule;

  visibility: Visibility;
  ownerUserId: string | null;

  isActive: boolean;

  createdByUserId: string;
  updatedByUserId: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface DebtScheduleEntity {
  id: string;
  workspaceId: string;
  debtId: string;

  dueDate: Date;
  amountExpected: number;

  status: DebtScheduleStatus;

  paidAt: Date | null;
  paidTransactionId: string | null;

  createdByUserId: string;
  updatedByUserId: string | null;

  createdAt: Date;
  updatedAt: Date;
}
