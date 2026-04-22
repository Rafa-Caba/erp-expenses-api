// src/shared/email/email.config.ts
import { getEnv } from "@/src/config/env";
import type { AppLinkOptions, EmailProvider } from "@/src/shared/email/email.types";

function normalizeBaseUrl(value: string): string {
    return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getOptionalTrimmedEnv(name: string): string | null {
    const rawValue = process.env[name];

    if (typeof rawValue !== "string") {
        return null;
    }

    const normalizedValue = rawValue.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}

function getEmailProvider(): EmailProvider {
    const envValue = getOptionalTrimmedEnv("EMAIL_PROVIDER");

    if (envValue === "resend") {
        return "resend";
    }

    return "console";
}

export function getAppName(): string {
    return getOptionalTrimmedEnv("APP_NAME") ?? "ERP Expenses";
}

export function getEmailSenderName(): string {
    return getOptionalTrimmedEnv("EMAIL_FROM_NAME") ?? getAppName();
}

export function getEmailSenderAddress(): string {
    return getOptionalTrimmedEnv("EMAIL_FROM_ADDRESS") ?? "no-reply@example.com";
}

export function getEmailFromHeader(): string {
    return `"${getEmailSenderName()}" <${getEmailSenderAddress()}>`;
}

export function getResendApiKey(): string {
    const apiKey = getOptionalTrimmedEnv("RESEND_API_KEY");

    if (!apiKey) {
        throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
    }

    return apiKey;
}

export function getEmailProviderConfig(): {
    provider: EmailProvider;
} {
    getEnv();

    return {
        provider: getEmailProvider(),
    };
}

export function getEmailVerificationTtlMinutes(): number {
    const env = getEnv();
    return env.EMAIL_VERIFICATION_TTL_MINUTES;
}

export function getPasswordResetTtlMinutes(): number {
    const env = getEnv();
    return env.PASSWORD_RESET_TTL_MINUTES;
}

export function buildAppUrl(input: AppLinkOptions): string {
    const baseUrl = normalizeBaseUrl(
        getOptionalTrimmedEnv("APP_BASE_URL") ??
        getOptionalTrimmedEnv("CORS_ORIGINS")?.split(",")[0]?.trim() ??
        "http://localhost:5173"
    );

    const normalizedPath = input.path.startsWith("/") ? input.path : `/${input.path}`;
    const url = new URL(`${baseUrl}${normalizedPath}`);

    if (input.token) {
        url.searchParams.set("token", input.token);
    }

    if (input.email) {
        url.searchParams.set("email", input.email);
    }

    return url.toString();
}

export function getVerifyEmailPath(): string {
    return getOptionalTrimmedEnv("VERIFY_EMAIL_PATH") ?? "/auth/verify-email";
}

export function getResetPasswordPath(): string {
    return getOptionalTrimmedEnv("RESET_PASSWORD_PATH") ?? "/auth/reset-password";
}