// src/themes/schemas/theme.schemas.ts

import { z } from "zod";

const hexColorSchema = z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "Color inválido. Usa formato HEX.");

const themeKeySchema = z.enum(["dark", "light", "customizable"]);

export const themeParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});

export const themeByKeyParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
        themeKey: themeKeySchema,
    }),
});

export const updateThemeSchema = z.object({
    body: z
        .object({
            name: z
                .string()
                .trim()
                .min(1, "El nombre no puede estar vacío.")
                .max(100, "El nombre no puede exceder 100 caracteres.")
                .optional(),
            description: z
                .union([
                    z.string().trim().max(300, "La descripción no puede exceder 300 caracteres."),
                    z.null(),
                ])
                .optional(),
            isActive: z.boolean().optional(),
            colors: z
                .object({
                    background: hexColorSchema.optional(),
                    surface: hexColorSchema.optional(),
                    surfaceAlt: hexColorSchema.optional(),
                    textPrimary: hexColorSchema.optional(),
                    textSecondary: hexColorSchema.optional(),
                    primary: hexColorSchema.optional(),
                    secondary: hexColorSchema.optional(),
                    success: hexColorSchema.optional(),
                    warning: hexColorSchema.optional(),
                    error: hexColorSchema.optional(),
                    info: hexColorSchema.optional(),
                    divider: hexColorSchema.optional(),
                })
                .optional(),
        })
        .refine((value) => Object.keys(value).length > 0, {
            message: "Debes enviar al menos un campo para actualizar.",
        }),
});