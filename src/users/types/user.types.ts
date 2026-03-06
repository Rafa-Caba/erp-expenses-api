export type UserRole = "USER" | "ADMIN";

export interface UserEntity {
    id: string;
    fullName: string;
    email: string;
    passwordHash: string;

    phone: string | null;
    avatarUrl: string | null;

    role: UserRole;

    isActive: boolean;
    isEmailVerified: boolean;

    emailVerificationTokenHash: string | null;
    emailVerificationExpiresAt: Date | null;

    passwordResetTokenHash: string | null;
    passwordResetExpiresAt: Date | null;

    lastLoginAt: Date | null;

    createdAt: Date;
    updatedAt: Date;
}

export interface PublicUserResponse {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    role: UserRole;
    isActive: boolean;
    isEmailVerified: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateUserInput = {
    fullName: string;
    email: string;
    password: string;
    phone?: string | null;
    avatarUrl?: string | null;
    role?: UserRole;
    isActive?: boolean;
    isEmailVerified?: boolean;
};

export type UpdateUserInput = Partial<{
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    role: UserRole;
    isActive: boolean;
    isEmailVerified: boolean;
}>;