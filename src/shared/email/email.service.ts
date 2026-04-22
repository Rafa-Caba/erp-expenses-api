// src/shared/email/email.service.ts

import { Resend } from "resend";

import {
    buildAppUrl,
    getAppName,
    getEmailFromHeader,
    getEmailProviderConfig,
    getEmailVerificationTtlMinutes,
    getPasswordResetTtlMinutes,
    getResetPasswordPath,
    getResendApiKey,
    getVerifyEmailPath,
} from "@/src/shared/email/email.config";
import {
    buildEmailVerificationTemplate,
    buildPasswordResetTemplate,
    buildReminderEmailTemplate,
} from "@/src/shared/email/email.templates";
import type {
    ReminderEmailTemplateInput,
    SendEmailInput,
    SendEmailResult,
} from "@/src/shared/email/email.types";

let cachedResendClient: Resend | null = null;

function getResendClient(): Resend {
    if (cachedResendClient) {
        return cachedResendClient;
    }

    cachedResendClient = new Resend(getResendApiKey());
    return cachedResendClient;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const config = getEmailProviderConfig();

    if (config.provider === "console") {
        console.log("[EMAIL:CONSOLE]", {
            to: input.to,
            subject: input.subject,
            text: input.text,
        });

        return {
            accepted: [input.to],
            rejected: [],
            messageId: null,
            provider: "console",
        };
    }

    const resendClient = getResendClient();
    const response = await resendClient.emails.send({
        from: getEmailFromHeader(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
    });

    if (response.error) {
        throw new Error(response.error.message);
    }

    return {
        accepted: [input.to],
        rejected: [],
        messageId: response.data?.id ?? null,
        provider: "resend",
    };
}

export async function sendEmailVerificationEmail(input: {
    to: string;
    recipientName: string;
    token: string;
}): Promise<SendEmailResult> {
    const verificationUrl = buildAppUrl({
        path: getVerifyEmailPath(),
        token: input.token,
        email: input.to,
    });

    const template = buildEmailVerificationTemplate({
        recipientName: input.recipientName,
        verificationUrl,
        expiresInMinutes: getEmailVerificationTtlMinutes(),
        appName: getAppName(),
    });

    return sendEmail({
        to: input.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
    });
}

export async function sendPasswordResetEmail(input: {
    to: string;
    recipientName: string;
    token: string;
}): Promise<SendEmailResult> {
    const resetUrl = buildAppUrl({
        path: getResetPasswordPath(),
        token: input.token,
        email: input.to,
    });

    const template = buildPasswordResetTemplate({
        recipientName: input.recipientName,
        resetUrl,
        expiresInMinutes: getPasswordResetTtlMinutes(),
        appName: getAppName(),
    });

    return sendEmail({
        to: input.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
    });
}

export async function sendReminderEmail(input: {
    to: string;
    template: ReminderEmailTemplateInput;
}): Promise<SendEmailResult> {
    const template = buildReminderEmailTemplate({
        ...input.template,
        appName: input.template.appName ?? getAppName(),
    });

    return sendEmail({
        to: input.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
    });
}