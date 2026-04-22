// src/shared/email/email.types.ts

export type EmailProvider = "console" | "resend";

export interface AppLinkOptions {
    path: string;
    token?: string;
    email?: string;
}

export interface SendEmailInput {
    to: string;
    subject: string;
    html: string;
    text: string;
}

export interface SendEmailResult {
    accepted: string[];
    rejected: string[];
    messageId: string | null;
    provider: EmailProvider;
}

export interface EmailVerificationTemplateInput {
    recipientName: string;
    verificationUrl: string;
    expiresInMinutes: number;
    appName?: string;
}

export interface PasswordResetTemplateInput {
    recipientName: string;
    resetUrl: string;
    expiresInMinutes: number;
    appName?: string;
}

export interface ReminderEmailTemplateInput {
    recipientName: string;
    workspaceName: string;
    title: string;
    description: string | null;
    dueDateLabel: string;
    reminderTypeLabel: string;
    priorityLabel: string | null;
    appName?: string;
}