import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().trim().email().max(255).toLowerCase(),
    password: z.string().min(1).max(255),
});

export const registerSchema = z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255).toLowerCase(),
    password: z.string().min(8).max(255),
    phone: z.union([z.string().trim().max(30), z.null()]).optional(),
    avatarUrl: z.union([z.string().trim().url(), z.null()]).optional(),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
    refreshToken: z.string().min(1),
});

export const updateMeSchema = z
    .object({
        fullName: z.string().trim().min(2).max(120).optional(),
        phone: z.union([z.string().trim().max(30), z.null()]).optional(),
        avatarUrl: z.union([z.string().trim().url(), z.null()]).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided",
    });

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1).max(255),
        newPassword: z.string().min(8).max(255),
    })
    .refine((value) => value.currentPassword !== value.newPassword, {
        message: "New password must be different from current password",
        path: ["newPassword"],
    });

export const forgotPasswordSchema = z.object({
    email: z.string().trim().email().max(255).toLowerCase(),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1),
    newPassword: z.string().min(8).max(255),
});

export const verifyEmailSchema = z.object({
    token: z.string().min(1),
});

export const resendVerificationSchema = z.object({
    email: z.string().trim().email().max(255).toLowerCase(),
});

export const authorizationHeaderSchema = z
    .string()
    .trim()
    .regex(/^Bearer\s.+$/, "Invalid authorization header format");

export type LoginSchemaInput = z.infer<typeof loginSchema>;
export type RegisterSchemaInput = z.infer<typeof registerSchema>;
export type RefreshTokenSchemaInput = z.infer<typeof refreshTokenSchema>;
export type LogoutSchemaInput = z.infer<typeof logoutSchema>;
export type UpdateMeSchemaInput = z.infer<typeof updateMeSchema>;
export type ChangePasswordSchemaInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordSchemaInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchemaInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailSchemaInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationSchemaInput = z.infer<typeof resendVerificationSchema>;