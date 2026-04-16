// src/shared/types/workspacePermissions.ts

export const workspacePermissionValues = [
    "workspace.read",
    "workspace.update",
    "workspace.archive",

    "workspace.settings.read",
    "workspace.settings.update",

    "themes.read",
    "themes.update",

    "workspace.members.read",
    "workspace.members.create",
    "workspace.members.update",
    "workspace.members.delete",
    "workspace.members.status.update",

    "accounts.read",
    "accounts.create",
    "accounts.update",
    "accounts.delete",

    "categories.read",
    "categories.create",
    "categories.update",
    "categories.delete",

    "transactions.read",
    "transactions.create",
    "transactions.update",
    "transactions.delete",

    "budgets.read",
    "budgets.create",
    "budgets.update",
    "budgets.delete",

    "debts.read",
    "debts.create",
    "debts.update",
    "debts.delete",
    "debts.pay",

    "payments.read",
    "payments.create",
    "payments.update",
    "payments.delete",

    "reconciliation.read",
    "reconciliation.create",
    "reconciliation.update",
    "reconciliation.delete",

    "savingGoals.read",
    "savingGoals.create",
    "savingGoals.update",
    "savingGoals.delete",

    "reminders.read",
    "reminders.create",
    "reminders.update",
    "reminders.delete",

    "reports.read",
    "reports.create",
    "reports.update",
    "reports.delete",
] as const;

export type WorkspacePermission = (typeof workspacePermissionValues)[number];