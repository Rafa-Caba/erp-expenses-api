// src/workspaceSettings/schemas/workspaceSettings.schemas.ts

import { z } from "zod";

const themeKeySchema = z.enum(["dark", "light", "customizable"]);

export const workspaceSettingsParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});

export const createWorkspaceSettingsSchema = z.object({
    body: z.object({
        defaultCurrency: z.enum(["MXN", "USD"]),
        language: z.enum(["es-MX", "en-US"]),
        timezone: z
            .string()
            .trim()
            .min(1, "La zona horaria es obligatoria.")
            .max(100, "La zona horaria no puede exceder 100 caracteres."),
        dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]),
        timeFormat: z.enum(["12h", "24h"]).optional(),
        theme: themeKeySchema.optional(),
        notificationsEnabled: z.boolean(),
        budgetAlertsEnabled: z.boolean(),
        debtAlertsEnabled: z.boolean(),
        allowMemberEdits: z.boolean(),
        weekStartsOn: z.union([
            z.literal(0),
            z.literal(1),
            z.literal(2),
            z.literal(3),
            z.literal(4),
            z.literal(5),
            z.literal(6),
        ]).optional(),
        decimalSeparator: z.enum([".", ","]).optional(),
        thousandSeparator: z.enum([",", ".", " "]).optional(),
        isVisible: z.boolean().optional(),
    }),
});

export const updateWorkspaceSettingsSchema = z.object({
    body: z.object({
        defaultCurrency: z.enum(["MXN", "USD"]).optional(),
        language: z.enum(["es-MX", "en-US"]).optional(),
        timezone: z
            .string()
            .trim()
            .min(1, "La zona horaria no puede estar vacía.")
            .max(100, "La zona horaria no puede exceder 100 caracteres.")
            .optional(),
        dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).optional(),
        timeFormat: z.enum(["12h", "24h"]).optional(),
        theme: themeKeySchema.optional(),
        notificationsEnabled: z.boolean().optional(),
        budgetAlertsEnabled: z.boolean().optional(),
        debtAlertsEnabled: z.boolean().optional(),
        allowMemberEdits: z.boolean().optional(),
        weekStartsOn: z.union([
            z.literal(0),
            z.literal(1),
            z.literal(2),
            z.literal(3),
            z.literal(4),
            z.literal(5),
            z.literal(6),
        ]).optional(),
        decimalSeparator: z.enum([".", ","]).optional(),
        thousandSeparator: z.enum([",", ".", " "]).optional(),
        isVisible: z.boolean().optional(),
    }),
});