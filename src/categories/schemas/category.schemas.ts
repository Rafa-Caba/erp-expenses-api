// src/categories/schemas/category.schemas.ts

import { z } from "zod";

const ObjectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

export const CategoryTypeSchema = z.enum(["INCOME", "EXPENSE"]);

export const CreateCategorySchema = z.object({
    name: z.string().trim().min(2).max(120),
    type: CategoryTypeSchema,
    color: z.string().trim().min(3).max(20).nullable().optional(),
    iconKey: z.string().trim().min(1).max(80).nullable().optional(),
    note: z.string().trim().max(2000).nullable().optional(),
});

export const UpdateCategorySchema = z.object({
    name: z.string().trim().min(2).max(120).optional(),
    type: CategoryTypeSchema.optional(),
    color: z.string().trim().min(3).max(20).nullable().optional(),
    iconKey: z.string().trim().min(1).max(80).nullable().optional(),
    note: z.string().trim().max(2000).nullable().optional(),
});

export const CategoriesListQuerySchema = z.object({
    includeInactive: z.coerce.boolean().optional().default(false),
    type: CategoryTypeSchema.optional(),
});

export const CategoryIdParamsSchema = z.object({
    workspaceId: ObjectIdSchema,
    categoryId: ObjectIdSchema,
});