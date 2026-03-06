// src/accounts/services/account.service.ts

import { Types } from "mongoose";

import { WorkspaceMemberModel } from "@/src/workspaces/models/WorkspaceMember.model";

import { AccountModel, type AccountDocument } from "../models/Account.model";
import type {
    AccountResponseDto,
    CreateAccountServiceInput,
    UpdateAccountServiceInput,
} from "../types/account.types";

export class AccountServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

function normalizeOptionalString(value?: string): string | null | undefined {
    if (value === undefined) {
        return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
}

function mapAccountToDto(account: AccountDocument): AccountResponseDto {
    return {
        id: account._id.toString(),
        workspaceId: account.workspaceId.toString(),
        ownerMemberId: account.ownerMemberId ? account.ownerMemberId.toString() : null,
        name: account.name,
        type: account.type,
        bankName: account.bankName ?? null,
        accountNumberMasked: account.accountNumberMasked ?? null,
        currency: account.currency,
        initialBalance: account.initialBalance,
        currentBalance: account.currentBalance,
        creditLimit: account.creditLimit ?? null,
        statementClosingDay: account.statementClosingDay ?? null,
        paymentDueDay: account.paymentDueDay ?? null,
        notes: account.notes ?? null,
        isActive: account.isActive,
        isArchived: account.isArchived ?? false,
        isVisible: account.isVisible ?? true,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
    };
}

async function validateOwnerMemberId(
    workspaceId: Types.ObjectId,
    ownerMemberId?: string
): Promise<Types.ObjectId | null> {
    if (!ownerMemberId) {
        return null;
    }

    if (!Types.ObjectId.isValid(ownerMemberId)) {
        throw new AccountServiceError(
            "El ownerMemberId no es válido.",
            400,
            "INVALID_OWNER_MEMBER_ID"
        );
    }

    const parsedOwnerMemberId = new Types.ObjectId(ownerMemberId);

    const member = await WorkspaceMemberModel.findOne({
        _id: parsedOwnerMemberId,
        workspaceId,
    }).select("_id");

    if (!member) {
        throw new AccountServiceError(
            "El ownerMemberId no pertenece a este workspace.",
            400,
            "OWNER_MEMBER_NOT_IN_WORKSPACE"
        );
    }

    return parsedOwnerMemberId;
}

function resolveCreditFields(input: {
    type: "cash" | "bank" | "wallet" | "savings" | "credit";
    creditLimit?: number;
    statementClosingDay?: number;
    paymentDueDay?: number;
}): {
    creditLimit: number | null;
    statementClosingDay: number | null;
    paymentDueDay: number | null;
} {
    if (input.type !== "credit") {
        return {
            creditLimit: null,
            statementClosingDay: null,
            paymentDueDay: null,
        };
    }

    return {
        creditLimit: input.creditLimit ?? null,
        statementClosingDay: input.statementClosingDay ?? null,
        paymentDueDay: input.paymentDueDay ?? null,
    };
}

export function isAccountServiceError(error: Error): error is AccountServiceError {
    return error instanceof AccountServiceError;
}

export async function getAccountsService(
    workspaceId: Types.ObjectId
): Promise<AccountResponseDto[]> {
    const accounts = await AccountModel.find({
        workspaceId,
        isArchived: false,
    }).sort({ createdAt: -1 });

    return accounts.map(mapAccountToDto);
}

export async function getAccountByIdService(
    workspaceId: Types.ObjectId,
    accountId: Types.ObjectId
): Promise<AccountResponseDto | null> {
    const account = await AccountModel.findOne({
        _id: accountId,
        workspaceId,
    });

    if (!account) {
        return null;
    }

    return mapAccountToDto(account);
}

export async function createAccountService(
    input: CreateAccountServiceInput
): Promise<AccountResponseDto> {
    const ownerMemberObjectId = await validateOwnerMemberId(
        input.workspaceId,
        input.body.ownerMemberId
    );

    const creditFields = resolveCreditFields({
        type: input.body.type,
        creditLimit: input.body.creditLimit,
        statementClosingDay: input.body.statementClosingDay,
        paymentDueDay: input.body.paymentDueDay,
    });

    const account = await AccountModel.create({
        workspaceId: input.workspaceId,
        ownerMemberId: ownerMemberObjectId,
        name: input.body.name.trim(),
        type: input.body.type,
        bankName: normalizeOptionalString(input.body.bankName) ?? null,
        accountNumberMasked:
            normalizeOptionalString(input.body.accountNumberMasked) ?? null,
        currency: input.body.currency,
        initialBalance: input.body.initialBalance,
        currentBalance: input.body.currentBalance ?? input.body.initialBalance,
        creditLimit: creditFields.creditLimit,
        statementClosingDay: creditFields.statementClosingDay,
        paymentDueDay: creditFields.paymentDueDay,
        notes: normalizeOptionalString(input.body.notes) ?? null,
        isActive: input.body.isActive ?? true,
        isArchived: input.body.isArchived ?? false,
        isVisible: input.body.isVisible ?? true,
    });

    return mapAccountToDto(account);
}

export async function updateAccountService(
    input: UpdateAccountServiceInput
): Promise<AccountResponseDto | null> {
    const account = await AccountModel.findOne({
        _id: input.accountId,
        workspaceId: input.workspaceId,
    });

    if (!account) {
        return null;
    }

    if (input.body.ownerMemberId !== undefined) {
        account.ownerMemberId = await validateOwnerMemberId(
            input.workspaceId,
            input.body.ownerMemberId
        );
    }

    if (input.body.name !== undefined) {
        account.name = input.body.name.trim();
    }

    if (input.body.type !== undefined) {
        account.type = input.body.type;
    }

    if (input.body.bankName !== undefined) {
        account.bankName = normalizeOptionalString(input.body.bankName) ?? null;
    }

    if (input.body.accountNumberMasked !== undefined) {
        account.accountNumberMasked =
            normalizeOptionalString(input.body.accountNumberMasked) ?? null;
    }

    if (input.body.currency !== undefined) {
        account.currency = input.body.currency;
    }

    if (input.body.initialBalance !== undefined) {
        account.initialBalance = input.body.initialBalance;
    }

    if (input.body.currentBalance !== undefined) {
        account.currentBalance = input.body.currentBalance;
    }

    const resolvedType = input.body.type ?? account.type;

    const creditFields = resolveCreditFields({
        type: resolvedType,
        creditLimit: input.body.creditLimit ?? account.creditLimit ?? undefined,
        statementClosingDay:
            input.body.statementClosingDay ?? account.statementClosingDay ?? undefined,
        paymentDueDay: input.body.paymentDueDay ?? account.paymentDueDay ?? undefined,
    });

    account.creditLimit = creditFields.creditLimit;
    account.statementClosingDay = creditFields.statementClosingDay;
    account.paymentDueDay = creditFields.paymentDueDay;

    if (input.body.notes !== undefined) {
        account.notes = normalizeOptionalString(input.body.notes) ?? null;
    }

    if (input.body.isActive !== undefined) {
        account.isActive = input.body.isActive;
    }

    if (input.body.isArchived !== undefined) {
        account.isArchived = input.body.isArchived;
    }

    if (input.body.isVisible !== undefined) {
        account.isVisible = input.body.isVisible;
    }

    await account.save();

    return mapAccountToDto(account);
}

export async function archiveAccountService(
    workspaceId: Types.ObjectId,
    accountId: Types.ObjectId
): Promise<AccountResponseDto | null> {
    const account = await AccountModel.findOneAndUpdate(
        {
            _id: accountId,
            workspaceId,
        },
        {
            isArchived: true,
            isActive: false,
        },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!account) {
        return null;
    }

    return mapAccountToDto(account);
}