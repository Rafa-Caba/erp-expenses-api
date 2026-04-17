// src/workspaces/schemas/workspaceMember.schemas.ts

import { z } from "zod";

import { workspacePermissionValues } from "@/src/shared/types/workspacePermissions";

export const workspaceMemberParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});

export const workspaceMemberByIdParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
        memberId: z.string().trim().min(1, "El id del miembro es obligatorio."),
    }),
});

const workspacePermissionSchema = z.enum(workspacePermissionValues);

const joinedAtSchema = z
    .string()
    .trim()
    .refine((value) => {
        if (value.length === 0) {
            return false;
        }

        const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
        const isIsoDateTime = z.string().datetime().safeParse(value).success;

        return isDateOnly || isIsoDateTime;
    }, "La fecha debe usar formato YYYY-MM-DD o datetime ISO válido.");

export const createWorkspaceMemberSchema = z.object({
    body: z.object({
        userId: z.string().trim().min(1, "El userId es obligatorio."),
        displayName: z
            .string()
            .trim()
            .min(1, "El nombre a mostrar es obligatorio.")
            .max(120, "El nombre a mostrar no puede exceder 120 caracteres."),
        role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
        permissions: z.array(workspacePermissionSchema).optional(),
        status: z.enum(["active", "invited", "disabled"]).optional(),
        joinedAt: joinedAtSchema.optional(),
        notes: z
            .string()
            .trim()
            .max(500, "Las notas no pueden exceder 500 caracteres.")
            .optional(),
        isVisible: z.boolean().optional(),
    }),
});

export const updateWorkspaceMemberSchema = z.object({
    body: z.object({
        displayName: z
            .string()
            .trim()
            .min(1, "El nombre a mostrar no puede estar vacío.")
            .max(120, "El nombre a mostrar no puede exceder 120 caracteres.")
            .optional(),
        role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]).optional(),
        permissions: z.array(workspacePermissionSchema).optional(),
        notes: z
            .string()
            .trim()
            .max(500, "Las notas no pueden exceder 500 caracteres.")
            .optional(),
        isVisible: z.boolean().optional(),
    }),
});

export const updateWorkspaceMemberStatusSchema = z.object({
    body: z.object({
        status: z.enum(["active", "invited", "disabled"]),
        joinedAt: joinedAtSchema.optional(),
    }),
});