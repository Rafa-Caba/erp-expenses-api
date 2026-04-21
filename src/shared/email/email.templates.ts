// src/shared/email/email.templates.ts
import type {
    EmailVerificationTemplateInput,
    PasswordResetTemplateInput,
    ReminderEmailTemplateInput,
} from "@/src/shared/email/email.types";

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderEmailShell(
    title: string,
    intro: string,
    bodyHtml: string,
    footer: string
): string {
    return `
        <div style="font-family: Arial, Helvetica, sans-serif; background: #f5f7fb; padding: 24px; color: #111827;">
            <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
                <h1 style="margin: 0 0 16px; font-size: 24px;">${title}</h1>
                <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.7;">${intro}</p>
                ${bodyHtml}
                <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.7; color: #6b7280;">${footer}</p>
            </div>
        </div>
    `;
}

export function buildEmailVerificationTemplate(input: EmailVerificationTemplateInput): {
    subject: string;
    html: string;
    text: string;
} {
    const appName = escapeHtml(input.appName ?? "ERP Expenses");
    const recipientName = escapeHtml(input.recipientName);
    const verificationUrl = escapeHtml(input.verificationUrl);
    const expiresInMinutes = String(input.expiresInMinutes);

    const subject = `${input.appName ?? "ERP Expenses"} | Verifica tu correo`;

    const html = renderEmailShell(
        "Verifica tu correo electrónico",
        `Hola ${recipientName}, te damos la bienvenida a ${appName}. Para activar tu cuenta, confirma tu correo con el siguiente botón:`,
        `
            <div style="margin: 20px 0;">
                <a href="${verificationUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 10px; padding: 12px 20px; font-weight: 700;">Verificar correo</a>
            </div>
            <p style="font-size: 14px; line-height: 1.7; margin: 0 0 10px;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="font-size: 14px; line-height: 1.7; word-break: break-all; margin: 0 0 10px;">${verificationUrl}</p>
            <p style="font-size: 14px; line-height: 1.7; margin: 0;">Este enlace expira en ${expiresInMinutes} minutos.</p>
        `,
        "Si tú no creaste esta cuenta, puedes ignorar este correo."
    );

    const text = [
        `Hola ${input.recipientName},`,
        `Bienvenido a ${input.appName ?? "ERP Expenses"}.`,
        "",
        "Verifica tu correo electrónico con este enlace:",
        input.verificationUrl,
        "",
        `Este enlace expira en ${input.expiresInMinutes} minutos.`,
        "",
        "Si tú no creaste esta cuenta, puedes ignorar este correo.",
    ].join("\n");

    return {
        subject,
        html,
        text,
    };
}

export function buildPasswordResetTemplate(input: PasswordResetTemplateInput): {
    subject: string;
    html: string;
    text: string;
} {
    const appName = escapeHtml(input.appName ?? "ERP Expenses");
    const recipientName = escapeHtml(input.recipientName);
    const resetUrl = escapeHtml(input.resetUrl);
    const expiresInMinutes = String(input.expiresInMinutes);

    const subject = `${input.appName ?? "ERP Expenses"} | Restablece tu contraseña`;

    const html = renderEmailShell(
        "Restablece tu contraseña",
        `Hola ${recipientName}, recibimos una solicitud para restablecer la contraseña de tu cuenta en ${appName}.`,
        `
            <div style="margin: 20px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; border-radius: 10px; padding: 12px 20px; font-weight: 700;">Restablecer contraseña</a>
            </div>
            <p style="font-size: 14px; line-height: 1.7; margin: 0 0 10px;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="font-size: 14px; line-height: 1.7; word-break: break-all; margin: 0 0 10px;">${resetUrl}</p>
            <p style="font-size: 14px; line-height: 1.7; margin: 0;">Este enlace expira en ${expiresInMinutes} minutos.</p>
        `,
        "Si tú no solicitaste este cambio, ignora este correo y tu contraseña seguirá igual."
    );

    const text = [
        `Hola ${input.recipientName},`,
        `Recibimos una solicitud para restablecer tu contraseña en ${input.appName ?? "ERP Expenses"}.`,
        "",
        "Usa este enlace:",
        input.resetUrl,
        "",
        `Este enlace expira en ${input.expiresInMinutes} minutos.`,
        "",
        "Si tú no solicitaste este cambio, ignora este correo.",
    ].join("\n");

    return {
        subject,
        html,
        text,
    };
}

export function buildReminderEmailTemplate(input: ReminderEmailTemplateInput): {
    subject: string;
    html: string;
    text: string;
} {
    const appName = escapeHtml(input.appName ?? "ERP Expenses");
    const recipientName = escapeHtml(input.recipientName);
    const workspaceName = escapeHtml(input.workspaceName);
    const title = escapeHtml(input.title);
    const description = input.description ? escapeHtml(input.description) : null;
    const dueDateLabel = escapeHtml(input.dueDateLabel);
    const reminderTypeLabel = escapeHtml(input.reminderTypeLabel);
    const priorityLabel = input.priorityLabel ? escapeHtml(input.priorityLabel) : null;

    const subject = `${input.appName ?? "ERP Expenses"} | Reminder: ${input.title}`;

    const descriptionHtml = description
        ? `<p style="font-size: 14px; line-height: 1.7; margin: 0 0 12px;"><strong>Descripción:</strong> ${description}</p>`
        : "";

    const priorityHtml = priorityLabel
        ? `<p style="font-size: 14px; line-height: 1.7; margin: 0 0 12px;"><strong>Prioridad:</strong> ${priorityLabel}</p>`
        : "";

    const html = renderEmailShell(
        "Tienes un recordatorio pendiente",
        `Hola ${recipientName}, este es un recordatorio generado por ${appName} para el workspace ${workspaceName}.`,
        `
            <p style="font-size: 14px; line-height: 1.7; margin: 0 0 12px;"><strong>Título:</strong> ${title}</p>
            <p style="font-size: 14px; line-height: 1.7; margin: 0 0 12px;"><strong>Tipo:</strong> ${reminderTypeLabel}</p>
            <p style="font-size: 14px; line-height: 1.7; margin: 0 0 12px;"><strong>Fecha:</strong> ${dueDateLabel}</p>
            ${priorityHtml}
            ${descriptionHtml}
        `,
        "Recuerda revisar este pendiente dentro de tu panel para mantener tus finanzas al día."
    );

    const text = [
        `Hola ${input.recipientName},`,
        `Tienes un recordatorio pendiente en ${input.workspaceName}.`,
        "",
        `Título: ${input.title}`,
        `Tipo: ${input.reminderTypeLabel}`,
        `Fecha: ${input.dueDateLabel}`,
        input.priorityLabel ? `Prioridad: ${input.priorityLabel}` : null,
        input.description ? `Descripción: ${input.description}` : null,
    ]
        .filter((value): value is string => Boolean(value))
        .join("\n");

    return {
        subject,
        html,
        text,
    };
}