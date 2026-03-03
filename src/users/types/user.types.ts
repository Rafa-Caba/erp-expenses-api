// src/users/types/user.types.ts

import type { CurrencyCode } from "@/src/shared/types/common";

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  passwordHash: string;

  defaultCurrency: CurrencyCode;
  timezone: string;

  lastLoginAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
  defaultCurrency?: CurrencyCode;
  timezone?: string;
};

export type UpdateUserInput = Partial<{
  name: string;
  defaultCurrency: CurrencyCode;
  timezone: string;
  lastLoginAt: Date | null;
}>;
