// src/categories/types/categories.types.ts

import type { ParamsDictionary } from "express-serve-static-core";
import type { Types } from "mongoose";

import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";

export const CATEGORY_TYPES = ["EXPENSE", "INCOME", "BOTH"] as const;

export type CategoryType = (typeof CATEGORY_TYPES)[number];

export interface WorkspaceCategoryParams extends ParamsDictionary {
    workspaceId: string;
}

export interface CategoryParams extends ParamsDictionary {
    workspaceId: string;
    categoryId: string;
}

export interface CreateCategoryBody {
    name: string;
    type: CategoryType;
    parentCategoryId?: string | null;
    color?: string | null;
    icon?: string | null;
    description?: string | null;
    sortOrder?: number;
    isSystem?: boolean;
    isActive?: boolean;
    isVisible?: boolean;
}

export interface UpdateCategoryBody {
    name?: string;
    type?: CategoryType;
    parentCategoryId?: string | null;
    color?: string | null;
    icon?: string | null;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
    isVisible?: boolean;
}

export interface CreateCategoryServiceInput {
    workspaceId: Types.ObjectId;
    body: CreateCategoryBody;
    workspace: WorkspaceDocument;
}

export interface UpdateCategoryServiceInput {
    workspaceId: Types.ObjectId;
    categoryId: Types.ObjectId;
    body: UpdateCategoryBody;
    workspace: WorkspaceDocument;
}

export interface ArchiveCategoryServiceInput {
    workspaceId: Types.ObjectId;
    categoryId: Types.ObjectId;
    workspace: WorkspaceDocument;
}