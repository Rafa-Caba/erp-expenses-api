// src/workspaces/schemas/workspace.schemas.ts

import { z } from "zod";

export const createWorkspaceSchema = z.object({
    body: z.object({
        type: z.enum(["PERSONAL", "HOUSEHOLD", "BUSINESS"]),
        kind: z.enum(["INDIVIDUAL", "COLLABORATIVE"]).optional(),
        name: z
            .string()
            .trim()
            .min(1, "El nombre es obligatorio.")
            .max(120, "El nombre no puede exceder 120 caracteres."),
        description: z
            .string()
            .trim()
            .max(500, "La descripción no puede exceder 500 caracteres.")
            .optional(),
        currency: z.enum(["MXN", "USD"]),
        timezone: z
            .string()
            .trim()
            .min(1, "La zona horaria es obligatoria.")
            .max(100, "La zona horaria no puede exceder 100 caracteres."),
        country: z
            .string()
            .trim()
            .max(100, "El país no puede exceder 100 caracteres.")
            .optional(),
        icon: z
            .string()
            .trim()
            .max(100, "El icono no puede exceder 100 caracteres.")
            .optional(),
        color: z
            .string()
            .trim()
            .max(30, "El color no puede exceder 30 caracteres.")
            .optional(),
        visibility: z.enum(["PRIVATE", "SHARED"]).optional(),
        isVisible: z.boolean().optional(),
    }),
});

export const updateWorkspaceSchema = z.object({
    body: z.object({
        type: z.enum(["PERSONAL", "HOUSEHOLD", "BUSINESS"]).optional(),
        kind: z.enum(["INDIVIDUAL", "COLLABORATIVE"]).optional(),
        name: z
            .string()
            .trim()
            .min(1, "El nombre no puede estar vacío.")
            .max(120, "El nombre no puede exceder 120 caracteres.")
            .optional(),
        description: z
            .string()
            .trim()
            .max(500, "La descripción no puede exceder 500 caracteres.")
            .optional(),
        currency: z.enum(["MXN", "USD"]).optional(),
        timezone: z
            .string()
            .trim()
            .min(1, "La zona horaria no puede estar vacía.")
            .max(100, "La zona horaria no puede exceder 100 caracteres.")
            .optional(),
        country: z
            .string()
            .trim()
            .max(100, "El país no puede exceder 100 caracteres.")
            .optional(),
        icon: z
            .string()
            .trim()
            .max(100, "El icono no puede exceder 100 caracteres.")
            .optional(),
        color: z
            .string()
            .trim()
            .max(30, "El color no puede exceder 30 caracteres.")
            .optional(),
        visibility: z.enum(["PRIVATE", "SHARED"]).optional(),
        isActive: z.boolean().optional(),
        isArchived: z.boolean().optional(),
        isVisible: z.boolean().optional(),
    }),
});

export const workspaceParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});