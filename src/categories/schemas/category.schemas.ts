// src/categories/schemas/category.schemas.ts

import { z } from "zod";

import { CATEGORY_TYPES } from "@/src/categories/types/category.types";

const hexColorRegex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const categoryTypeSchema = z.enum(CATEGORY_TYPES);

const createCategoryBodySchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "El nombre es obligatorio.")
        .max(120, "El nombre no puede exceder 120 caracteres."),
    type: categoryTypeSchema,
    parentCategoryId: z.string().trim().min(1).nullable().optional(),
    color: z
        .string()
        .trim()
        .max(30, "El color no puede exceder 30 caracteres.")
        .refine((value) => hexColorRegex.test(value), {
            message: "El color debe ser un hexadecimal válido.",
        })
        .nullable()
        .optional(),
    icon: z
        .string()
        .trim()
        .max(100, "El icono no puede exceder 100 caracteres.")
        .nullable()
        .optional(),
    description: z
        .string()
        .trim()
        .max(500, "La descripción no puede exceder 500 caracteres.")
        .nullable()
        .optional(),
    sortOrder: z
        .number()
        .int("El orden debe ser un número entero.")
        .min(0, "El orden no puede ser negativo.")
        .optional(),
    isSystem: z.boolean().optional(),
    isActive: z.boolean().optional(),
    isVisible: z.boolean().optional(),
});

const updateCategoryBodySchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "El nombre no puede estar vacío.")
        .max(120, "El nombre no puede exceder 120 caracteres.")
        .optional(),
    type: categoryTypeSchema.optional(),
    parentCategoryId: z.string().trim().min(1).nullable().optional(),
    color: z
        .string()
        .trim()
        .max(30, "El color no puede exceder 30 caracteres.")
        .refine((value) => hexColorRegex.test(value), {
            message: "El color debe ser un hexadecimal válido.",
        })
        .nullable()
        .optional(),
    icon: z
        .string()
        .trim()
        .max(100, "El icono no puede exceder 100 caracteres.")
        .nullable()
        .optional(),
    description: z
        .string()
        .trim()
        .max(500, "La descripción no puede exceder 500 caracteres.")
        .nullable()
        .optional(),
    sortOrder: z
        .number()
        .int("El orden debe ser un número entero.")
        .min(0, "El orden no puede ser negativo.")
        .optional(),
    isActive: z.boolean().optional(),
    isVisible: z.boolean().optional(),
});

export const workspaceCategoryParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});

export const categoryParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
        categoryId: z.string().trim().min(1, "El id de la categoría es obligatorio."),
    }),
});

export const createCategorySchema = z.object({
    body: createCategoryBodySchema,
});

export const updateCategorySchema = z.object({
    body: updateCategoryBodySchema,
});