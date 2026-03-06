// src/shared/types/common.ts

export type CurrencyCode = "MXN" | "USD";

export type WorkspaceType = "PERSONAL" | "HOUSEHOLD" | "BUSINESS";
export type WorkspaceVisibility = "PRIVATE" | "SHARED";
export type WorkspaceKind = "INDIVIDUAL" | "COLLABORATIVE";

export type MemberRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type MemberStatus = "active" | "invited" | "disabled";

export type AccountType = "cash" | "debit" | "credit" | "wallet";

export type DebtType = "credit_card" | "loan" | "personal" | "service";
export type DebtScheduleStatus = "pending" | "paid" | "overdue" | "skipped";

export type TransactionType =
  | "expense"
  | "income"
  | "debt_payment"
  | "transfer"
  | "adjustment";

export type TransactionDirection = "in" | "out";