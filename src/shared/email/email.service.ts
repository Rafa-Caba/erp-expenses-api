// src/shared/email/email.service.ts
import {
    buildAppUrl,
    getAppName,
    getEmailFromHeader,
    getEmailProviderConfig,
    getEmailVerificationTtlMinutes,
    getPasswordResetTtlMinutes,
    getResetPasswordPath,
    getVerifyEmailPath,
} from "@/src/shared/email/email.config";
import {
    buildEmailVerificationTemplate,
    buildPasswordResetTemplate,
    buildReminderEmailTemplate,
} from "@/src/shared/email/email.templates";
import type {
    NodemailerModule,
    ReminderEmailTemplateInput,
    SendEmailInput,
    SendEmailResult,
    SmtpTransporter,
} from "@/src/shared/email/email.types";

let cachedTransporter: SmtpTransporter | null = null;

function getSmtpTransporter(): SmtpTransporter {
    if (cachedTransporter) {
        return cachedTransporter;
    }

    const config = getEmailProviderConfig();

    if (config.provider !== "smtp" || !config.smtp) {
        throw new Error("SMTP transporter is not available when EMAIL_PROVIDER is not smtp.");
    }

    const nodemailerModule = require("nodemailer") as NodemailerModule;
    cachedTransporter = nodemailerModule.createTransport(config.smtp);

    return cachedTransporter;
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

    const transporter = getSmtpTransporter();
    const info = await transporter.sendMail({
        from: getEmailFromHeader(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
    });

    return {
        accepted: info.accepted ?? [input.to],
        rejected: info.rejected ?? [],
        messageId: info.messageId ?? null,
        provider: "smtp",
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