// src/categories/types/category.types.ts

export type CategoryType = "expense" | "income" | "both";

export interface CategoryEntity {
  id: string;
  workspaceId: string;

  name: string;
  type: CategoryType;
  isActive: boolean;

  createdByUserId: string;
  updatedByUserId: string | null;

  createdAt: Date;
  updatedAt: Date;
}
