// src/reminders/services/reminderNotifications.service.ts

import { UserModel } from "@/src/users/models/User.model";
import { sendReminderEmail } from "@/src/shared/email/email.service";
import { WorkspaceMemberModel } from "@/src/workspaces/models/WorkspaceMember.model";
import type { WorkspaceDocument } from "@/src/workspaces/models/Workspace.model";
import type { ReminderDocument } from "@/src/reminders/types/reminders.types";

interface ReminderEmailRecipient {
    email: string;
    name: string;
}

interface WorkspaceMemberRecipientRecord {
    _id: ReminderDocument["recipientMemberIds"][number];
    userId: WorkspaceDocument["ownerUserId"];
    displayName: string;
    status: "active" | "invited" | "disabled";
}

interface ActiveUserRecipientRecord {
    _id: WorkspaceDocument["ownerUserId"];
    email: string;
    fullName: string;
    isActive: boolean;
}

function formatReminderTypeLabel(type: ReminderDocument["type"]): string {
    switch (type) {
        case "bill":
            return "Pago";
        case "debt":
            return "Deuda";
        case "subscription":
            return "Suscripción";
        default:
            return "Recordatorio";
    }
}

function formatPriorityLabel(priority: ReminderDocument["priority"]): string | null {
    if (priority === "high") return "Alta";
    if (priority === "medium") return "Media";
    if (priority === "low") return "Baja";
    return null;
}

function formatDueDateLabel(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat("es-MX", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: timezone,
    }).format(date);
}

function dedupeRecipients(recipients: ReminderEmailRecipient[]): ReminderEmailRecipient[] {
    const seenEmails = new Set<string>();
    const uniqueRecipients: ReminderEmailRecipient[] = [];

    for (const recipient of recipients) {
        const normalizedEmail = recipient.email.trim().toLowerCase();

        if (normalizedEmail.length === 0 || seenEmails.has(normalizedEmail)) {
            continue;
        }

        seenEmails.add(normalizedEmail);
        uniqueRecipients.push({
            email: recipient.email,
            name: recipient.name,
        });
    }

    return uniqueRecipients;
}

async function resolveReminderRecipients(input: {
    workspace: WorkspaceDocument;
    reminder: ReminderDocument;
}): Promise<ReminderEmailRecipient[]> {
    const recipientMemberIds = input.reminder.recipientMemberIds ?? [];

    if (recipientMemberIds.length > 0) {
        const workspaceMembers = await WorkspaceMemberModel.find({
            _id: { $in: recipientMemberIds },
            workspaceId: input.workspace._id,
            status: "active",
        }).lean<WorkspaceMemberRecipientRecord[]>();

        if (workspaceMembers.length > 0) {
            const userIds = workspaceMembers.map((member) => member.userId);

            const users = await UserModel.find({
                _id: { $in: userIds },
                isActive: true,
            })
                .select("email fullName isActive")
                .lean<ActiveUserRecipientRecord[]>();

            if (users.length > 0) {
                const userById = new Map<string, ActiveUserRecipientRecord>();

                for (const user of users) {
                    userById.set(String(user._id), user);
                }

                const resolvedRecipients = workspaceMembers
                    .map<ReminderEmailRecipient | null>((member) => {
                        const matchedUser = userById.get(String(member.userId));

                        if (!matchedUser || !matchedUser.isActive) {
                            return null;
                        }

                        return {
                            email: matchedUser.email,
                            name:
                                member.displayName.trim() ||
                                matchedUser.fullName.trim() ||
                                matchedUser.email,
                        };
                    })
                    .filter(
                        (
                            recipient
                        ): recipient is ReminderEmailRecipient => recipient !== null
                    );

                const uniqueRecipients = dedupeRecipients(resolvedRecipients);

                if (uniqueRecipients.length > 0) {
                    return uniqueRecipients;
                }
            }
        }
    }

    const owner = await UserModel.findById(input.workspace.ownerUserId)
        .select("email fullName isActive")
        .lean<ActiveUserRecipientRecord | null>();

    if (!owner || !owner.isActive) {
        return [];
    }

    return [
        {
            email: owner.email,
            name: owner.fullName,
        },
    ];
}

export async function sendReminderNotificationEmailService(input: {
    workspace: WorkspaceDocument;
    reminder: ReminderDocument;
}): Promise<{ delivered: boolean; recipientEmails: string[] }> {
    if (input.reminder.channel !== "email" && input.reminder.channel !== "both") {
        return {
            delivered: false,
            recipientEmails: [],
        };
    }

    const recipients = await resolveReminderRecipients(input);

    if (recipients.length === 0) {
        return {
            delivered: false,
            recipientEmails: [],
        };
    }

    const dueDateLabel = formatDueDateLabel(
        input.reminder.dueDate,
        input.workspace.timezone
    );

    const reminderTypeLabel = formatReminderTypeLabel(input.reminder.type);
    const priorityLabel = formatPriorityLabel(input.reminder.priority ?? null);

    await Promise.all(
        recipients.map((recipient) =>
            sendReminderEmail({
                to: recipient.email,
                template: {
                    recipientName: recipient.name,
                    workspaceName: input.workspace.name,
                    title: input.reminder.title,
                    description: input.reminder.description ?? null,
                    dueDateLabel,
                    reminderTypeLabel,
                    priorityLabel,
                },
            })
        )
    );

    return {
        delivered: true,
        recipientEmails: recipients.map((recipient) => recipient.email),
    };
}