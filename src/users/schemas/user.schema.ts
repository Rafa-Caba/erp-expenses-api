import { z } from "zod";

export const userRoleSchema = z.enum(["USER", "ADMIN"]);

const objectIdSchema = z
    .string()
    .trim()
    .regex(/^[a-f\d]{24}$/i, "Invalid user id");

const booleanFromQuerySchema = z.preprocess((value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
}, z.boolean());

export const userIdParamSchema = z.object({
    id: objectIdSchema,
});

export const createUserSchema = z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255).toLowerCase(),
    password: z.string().min(8).max(255),
    phone: z.union([z.string().trim().max(30), z.null()]).optional(),
    avatarUrl: z.union([z.string().trim().url(), z.null()]).optional(),
    role: userRoleSchema.optional(),
    isActive: z.boolean().optional(),
    isEmailVerified: z.boolean().optional(),
});

export const updateUserSchema = z
    .object({
        fullName: z.string().trim().min(2).max(120).optional(),
        email: z.string().trim().email().max(255).toLowerCase().optional(),
        phone: z.union([z.string().trim().max(30), z.null()]).optional(),
        avatarUrl: z.union([z.string().trim().url(), z.null()]).optional(),
        role: userRoleSchema.optional(),
        isActive: z.boolean().optional(),
        isEmailVerified: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided",
    });

export const listUsersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().min(1).optional(),
    isActive: booleanFromQuerySchema.optional(),
    role: userRoleSchema.optional(),
});

export type UserIdParamInput = z.infer<typeof userIdParamSchema>;
export type CreateUserSchemaInput = z.infer<typeof createUserSchema>;
export type UpdateUserSchemaInput = z.infer<typeof updateUserSchema>;
export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>;