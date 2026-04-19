// src/reminders/schemas/reminders.schemas.ts

import { z } from "zod";

import {
    REMINDER_CHANNEL_VALUES,
    REMINDER_MEMBER_RESPONSE_STATUS_VALUES,
    REMINDER_PRIORITY_VALUES,
    REMINDER_RELATED_ENTITY_TYPE_VALUES,
    REMINDER_TYPE_VALUES,
} from "../types/reminders.types";

function isValidDateString(value: string): boolean {
    const parsedDate = new Date(value);
    return !Number.isNaN(parsedDate.getTime());
}

const formBooleanSchema = z.union([
    z.boolean(),
    z.literal("true").transform(() => true),
    z.literal("false").transform(() => false),
    z.literal("1").transform(() => true),
    z.literal("0").transform(() => false),
    z.literal("yes").transform(() => true),
    z.literal("no").transform(() => false),
    z.literal("y").transform(() => true),
    z.literal("n").transform(() => false),
    z.literal("on").transform(() => true),
    z.literal("off").transform(() => false),
]);

const nullableTrimmedStringSchema = z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
        if (value === undefined || value === null) {
            return value;
        }

        const normalizedValue = value.trim();
        return normalizedValue.length > 0 ? normalizedValue : null;
    });

const createReminderBodySchema = z
    .object({
        targetMemberId: nullableTrimmedStringSchema,
        title: z
            .string()
            .trim()
            .min(1, "El título del recordatorio es obligatorio.")
            .max(255, "El título del recordatorio no puede exceder 255 caracteres."),
        description: z
            .union([z.string(), z.null()])
            .optional()
            .transform((value) => {
                if (value === undefined || value === null) {
                    return value;
                }

                return value.trim();
            })
            .refine(
                (value) => value === undefined || value === null || value.length <= 1000,
                {
                    message: "La descripción no puede exceder 1000 caracteres.",
                }
            ),
        type: z.enum(REMINDER_TYPE_VALUES, {
            message: "El tipo de recordatorio no es válido.",
        }),
        relatedEntityType: z
            .enum(REMINDER_RELATED_ENTITY_TYPE_VALUES, {
                message: "El tipo de entidad relacionada no es válido.",
            })
            .nullable()
            .optional(),
        relatedEntityId: nullableTrimmedStringSchema,
        dueDate: z.string().trim().refine(isValidDateString, {
            message: "La fecha de vencimiento no es válida.",
        }),
        isRecurring: formBooleanSchema,
        recurrenceRule: z
            .union([z.string(), z.null()])
            .optional()
            .transform((value) => {
                if (value === undefined || value === null) {
                    return value;
                }

                const normalizedValue = value.trim();
                return normalizedValue.length > 0 ? normalizedValue : null;
            })
            .refine(
                (value) => value === undefined || value === null || value.length <= 255,
                {
                    message: "La regla de recurrencia no puede exceder 255 caracteres.",
                }
            ),
        priority: z
            .enum(REMINDER_PRIORITY_VALUES, {
                message: "La prioridad no es válida.",
            })
            .nullable()
            .optional(),
        channel: z
            .enum(REMINDER_CHANNEL_VALUES, {
                message: "El canal del recordatorio no es válido.",
            })
            .optional(),
        isVisible: formBooleanSchema.optional(),
    })
    .superRefine((body, ctx) => {
        const hasRelatedEntityType =
            body.relatedEntityType !== undefined &&
            body.relatedEntityType !== null;
        const hasRelatedEntityId =
            typeof body.relatedEntityId === "string" &&
            body.relatedEntityId.trim().length > 0;

        if (hasRelatedEntityType !== hasRelatedEntityId) {
            ctx.addIssue({
                code: "custom",
                path: ["relatedEntityType"],
                message: "relatedEntityType y relatedEntityId deben enviarse juntos.",
            });

            ctx.addIssue({
                code: "custom",
                path: ["relatedEntityId"],
                message: "relatedEntityId y relatedEntityType deben enviarse juntos.",
            });
        }

        if (body.isRecurring && (!body.recurrenceRule || body.recurrenceRule.length === 0)) {
            ctx.addIssue({
                code: "custom",
                path: ["recurrenceRule"],
                message: "La regla de recurrencia es obligatoria cuando el recordatorio es recurrente.",
            });
        }
    });

const updateReminderBodySchema = z
    .object({
        targetMemberId: nullableTrimmedStringSchema,
        title: z
            .string()
            .trim()
            .min(1, "El título del recordatorio es obligatorio.")
            .max(255, "El título del recordatorio no puede exceder 255 caracteres.")
            .optional(),
        description: z
            .union([z.string(), z.null()])
            .optional()
            .transform((value) => {
                if (value === undefined || value === null) {
                    return value;
                }

                return value.trim();
            })
            .refine(
                (value) => value === undefined || value === null || value.length <= 1000,
                {
                    message: "La descripción no puede exceder 1000 caracteres.",
                }
            ),
        type: z
            .enum(REMINDER_TYPE_VALUES, {
                message: "El tipo de recordatorio no es válido.",
            })
            .optional(),
        relatedEntityType: z
            .enum(REMINDER_RELATED_ENTITY_TYPE_VALUES, {
                message: "El tipo de entidad relacionada no es válido.",
            })
            .nullable()
            .optional(),
        relatedEntityId: nullableTrimmedStringSchema,
        dueDate: z
            .string()
            .trim()
            .refine(isValidDateString, {
                message: "La fecha de vencimiento no es válida.",
            })
            .optional(),
        isRecurring: formBooleanSchema.optional(),
        recurrenceRule: z
            .union([z.string(), z.null()])
            .optional()
            .transform((value) => {
                if (value === undefined || value === null) {
                    return value;
                }

                const normalizedValue = value.trim();
                return normalizedValue.length > 0 ? normalizedValue : null;
            })
            .refine(
                (value) => value === undefined || value === null || value.length <= 255,
                {
                    message: "La regla de recurrencia no puede exceder 255 caracteres.",
                }
            ),
        priority: z
            .enum(REMINDER_PRIORITY_VALUES, {
                message: "La prioridad no es válida.",
            })
            .nullable()
            .optional(),
        channel: z
            .enum(REMINDER_CHANNEL_VALUES, {
                message: "El canal del recordatorio no es válido.",
            })
            .optional(),
        isVisible: formBooleanSchema.optional(),
    })
    .superRefine((body, ctx) => {
        const hasRelatedEntityType =
            body.relatedEntityType !== undefined &&
            body.relatedEntityType !== null;
        const hasRelatedEntityId =
            typeof body.relatedEntityId === "string" &&
            body.relatedEntityId.trim().length > 0;

        if (hasRelatedEntityType !== hasRelatedEntityId) {
            ctx.addIssue({
                code: "custom",
                path: ["relatedEntityType"],
                message: "relatedEntityType y relatedEntityId deben enviarse juntos.",
            });

            ctx.addIssue({
                code: "custom",
                path: ["relatedEntityId"],
                message: "relatedEntityId y relatedEntityType deben enviarse juntos.",
            });
        }

        if (
            body.isRecurring === true &&
            (!body.recurrenceRule || body.recurrenceRule.length === 0)
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["recurrenceRule"],
                message: "La regla de recurrencia es obligatoria cuando el recordatorio es recurrente.",
            });
        }
    });

const respondToReminderBodySchema = z.object({
    status: z.enum(
        REMINDER_MEMBER_RESPONSE_STATUS_VALUES.filter(
            (value) => value !== "pending"
        ) as ["done", "dismissed"],
        {
            message: "La respuesta del recordatorio no es válida.",
        }
    ),
});

export const workspaceReminderParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
    }),
});

export const reminderParamsSchema = z.object({
    params: z.object({
        workspaceId: z.string().trim().min(1, "El id del workspace es obligatorio."),
        reminderId: z.string().trim().min(1, "El id del recordatorio es obligatorio."),
    }),
});

export const createReminderSchema = z.object({
    body: createReminderBodySchema,
});

export const updateReminderSchema = z.object({
    body: updateReminderBodySchema,
});

export const respondToReminderSchema = z.object({
    body: respondToReminderBodySchema,
});