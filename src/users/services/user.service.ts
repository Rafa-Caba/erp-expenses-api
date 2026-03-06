import bcrypt from "bcryptjs";

import { RefreshTokenModel } from "@/src/auth/models/RefreshToken.model";
import type { ListUsersQueryInput } from "@/src/users/schemas/user.schema";
import { UserModel } from "@/src/users/models/User.model";
import type {
    CreateUserInput,
    PublicUserResponse,
    UpdateUserInput,
} from "@/src/users/types/user.types";

type ServiceErrorCode = "USER_NOT_FOUND" | "EMAIL_ALREADY_IN_USE";

type ServiceSuccess<T> = {
    ok: true;
    data: T;
};

type ServiceFailure = {
    ok: false;
    error: {
        code: ServiceErrorCode;
        message: string;
    };
};

type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

type UserListResult = {
    items: PublicUserResponse[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
};

type IdLike = {
    id?: string;
    _id?: string | { toString(): string };
};

type PublicUserLike = IdLike & {
    fullName: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
    role: "USER" | "ADMIN";
    isActive: boolean;
    isEmailVerified: boolean;
    lastLoginAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

function normalizeNullableString(value: string | null | undefined): string | null {
    return typeof value === "string" ? value : null;
}

function normalizeNullableDate(value: Date | null | undefined): Date | null {
    return value instanceof Date ? value : null;
}

function getDocumentId(value: IdLike): string {
    if (typeof value.id === "string" && value.id.length > 0) {
        return value.id;
    }

    if (typeof value._id === "string" && value._id.length > 0) {
        return value._id;
    }

    if (value._id && typeof value._id.toString === "function") {
        return value._id.toString();
    }

    throw new Error("Document id is missing");
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapPublicUser(user: PublicUserLike): PublicUserResponse {
    return {
        id: getDocumentId(user),
        fullName: user.fullName,
        email: user.email,
        phone: normalizeNullableString(user.phone),
        avatarUrl: normalizeNullableString(user.avatarUrl),
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: normalizeNullableDate(user.lastLoginAt),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany(
        {
            userId,
            revokedAt: null,
        },
        {
            revokedAt: new Date(),
        }
    );
}

export async function listUsersService(input: ListUsersQueryInput): Promise<UserListResult> {
    const { page, limit, search, isActive, role } = input;

    const filters: {
        isActive?: boolean;
        role?: "USER" | "ADMIN";
        $or?: Array<
            | { fullName: { $regex: string; $options: string } }
            | { email: { $regex: string; $options: string } }
        >;
    } = {};

    if (typeof isActive === "boolean") {
        filters.isActive = isActive;
    }

    if (role) {
        filters.role = role;
    }

    if (search) {
        const safeSearch = escapeRegex(search);

        filters.$or = [
            { fullName: { $regex: safeSearch, $options: "i" } },
            { email: { $regex: safeSearch, $options: "i" } },
        ];
    }

    const skip = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
        UserModel.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
        UserModel.countDocuments(filters),
    ]);

    return {
        items: items.map((item) => mapPublicUser(item)),
        pagination: {
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit) || 1,
        },
    };
}

export async function getUserByIdService(id: string): Promise<ServiceResult<PublicUserResponse>> {
    const user = await UserModel.findById(id);

    if (!user) {
        return {
            ok: false,
            error: {
                code: "USER_NOT_FOUND",
                message: "User not found",
            },
        };
    }

    return {
        ok: true,
        data: mapPublicUser(user),
    };
}

export async function createUserService(
    input: CreateUserInput
): Promise<ServiceResult<PublicUserResponse>> {
    const existingUser = await UserModel.findOne({ email: input.email });

    if (existingUser) {
        return {
            ok: false,
            error: {
                code: "EMAIL_ALREADY_IN_USE",
                message: "Email is already in use",
            },
        };
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const createdUser = await UserModel.create({
        fullName: input.fullName,
        email: input.email,
        passwordHash,
        phone: input.phone ?? null,
        avatarUrl: input.avatarUrl ?? null,
        role: input.role ?? "USER",
        isActive: input.isActive ?? true,
        isEmailVerified: input.isEmailVerified ?? false,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        lastLoginAt: null,
    });

    return {
        ok: true,
        data: mapPublicUser(createdUser),
    };
}

export async function updateUserService(
    id: string,
    input: UpdateUserInput
): Promise<ServiceResult<PublicUserResponse>> {
    const currentUser = await UserModel.findById(id);

    if (!currentUser) {
        return {
            ok: false,
            error: {
                code: "USER_NOT_FOUND",
                message: "User not found",
            },
        };
    }

    if (input.email && input.email !== currentUser.email) {
        const existingUserWithEmail = await UserModel.findOne({
            email: input.email,
            _id: { $ne: id },
        });

        if (existingUserWithEmail) {
            return {
                ok: false,
                error: {
                    code: "EMAIL_ALREADY_IN_USE",
                    message: "Email is already in use",
                },
            };
        }
    }

    const shouldRevokeSessions =
        typeof input.isActive !== "undefined" && input.isActive === false && currentUser.isActive;

    if (typeof input.fullName !== "undefined") {
        currentUser.fullName = input.fullName;
    }

    if (typeof input.email !== "undefined") {
        currentUser.email = input.email;
    }

    if (typeof input.phone !== "undefined") {
        currentUser.phone = input.phone;
    }

    if (typeof input.avatarUrl !== "undefined") {
        currentUser.avatarUrl = input.avatarUrl;
    }

    if (typeof input.role !== "undefined") {
        currentUser.role = input.role;
    }

    if (typeof input.isActive !== "undefined") {
        currentUser.isActive = input.isActive;
    }

    if (typeof input.isEmailVerified !== "undefined") {
        currentUser.isEmailVerified = input.isEmailVerified;
    }

    await currentUser.save();

    if (shouldRevokeSessions) {
        await revokeAllUserRefreshTokens(getDocumentId(currentUser));
    }

    return {
        ok: true,
        data: mapPublicUser(currentUser),
    };
}

export async function deleteUserService(id: string): Promise<ServiceResult<{ id: string }>> {
    const deletedUser = await UserModel.findByIdAndDelete(id);

    if (!deletedUser) {
        return {
            ok: false,
            error: {
                code: "USER_NOT_FOUND",
                message: "User not found",
            },
        };
    }

    await RefreshTokenModel.deleteMany({ userId: getDocumentId(deletedUser) });

    return {
        ok: true,
        data: { id },
    };
}