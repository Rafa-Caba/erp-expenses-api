import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import type { StringValue } from "ms";

import { RefreshTokenModel } from "@/src/auth/models/RefreshToken.model";
import { UserModel } from "@/src/users/models/User.model";
import type {
    AuthAccessTokenPayload,
    AuthRefreshTokenPayload,
    AuthSuccessResponse,
    AuthUserResponse,
    ChangePasswordPayload,
    ChangePasswordResponse,
    ForgotPasswordPayload,
    ForgotPasswordResponse,
    LoginPayload,
    LogoutAllResponse,
    LogoutPayload,
    LogoutResponse,
    MessageResponse,
    RefreshTokenPayload,
    RegisterPayload,
    ResendVerificationPayload,
    ResendVerificationResponse,
    ResetPasswordPayload,
    SessionMetaInput,
    UpdateMePayload,
    VerifyEmailPayload,
    VerifyEmailResponse,
} from "@/src/auth/types/auth.types";
import type { UserRole } from "@/src/users/types/user.types";

type ServiceErrorCode =
    | "INVALID_CREDENTIALS"
    | "USER_NOT_FOUND"
    | "EMAIL_ALREADY_IN_USE"
    | "USER_INACTIVE"
    | "INVALID_REFRESH_TOKEN"
    | "INVALID_RESET_TOKEN"
    | "INVALID_VERIFICATION_TOKEN"
    | "PASSWORD_MISMATCH";

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

type PersistRefreshTokenInput = {
    userId: string;
    refreshToken: string;
    expiresAt: Date;
    meta?: SessionMetaInput;
};

type TokenCreationResult = {
    plainToken: string;
    tokenHash: string;
    expiresAt: Date;
};

type IdLike = {
    id?: string;
    _id?: string | { toString(): string };
};

type AuthUserLike = IdLike & {
    fullName: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
    role: UserRole;
    isActive: boolean;
    isEmailVerified: boolean;
    lastLoginAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

type EmailVerificationTokenAttachable = {
    emailVerificationTokenHash?: string | null;
    emailVerificationExpiresAt?: Date | null;
    save: () => Promise<unknown>;
};

function isProduction(): boolean {
    return process.env.NODE_ENV === "production";
}

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

function getAccessTokenSecret(): string {
    const secret = process.env.ACCESS_TOKEN_SECRET;

    if (!secret) {
        throw new Error("Missing ACCESS_TOKEN_SECRET");
    }

    return secret;
}

function getRefreshTokenSecret(): string {
    const secret = process.env.REFRESH_TOKEN_SECRET;

    if (!secret) {
        throw new Error("Missing REFRESH_TOKEN_SECRET");
    }

    return secret;
}

function getAccessTokenExpiresIn(): number | StringValue {
    const rawValue = process.env.ACCESS_TOKEN_EXPIRES_IN;

    if (!rawValue) {
        return "15m";
    }

    if (/^\d+$/.test(rawValue)) {
        return Number(rawValue);
    }

    return rawValue as StringValue;
}

function getRefreshTokenExpiresIn(): number | StringValue {
    const rawValue = process.env.REFRESH_TOKEN_EXPIRES_IN;

    if (!rawValue) {
        return "7d";
    }

    if (/^\d+$/.test(rawValue)) {
        return Number(rawValue);
    }

    return rawValue as StringValue;
}

function getEmailVerificationTtlMinutes(): number {
    const rawValue = process.env.EMAIL_VERIFICATION_TTL_MINUTES;
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return 60 * 24;
    }

    return parsedValue;
}

function getPasswordResetTtlMinutes(): number {
    const rawValue = process.env.PASSWORD_RESET_TTL_MINUTES;
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return 30;
    }

    return parsedValue;
}

function getRefreshTokenTtlMs(): number {
    const rawValue = getRefreshTokenExpiresIn();

    if (typeof rawValue === "number") {
        return rawValue * 1000;
    }

    const match = /^(\d+)([smhd])$/.exec(rawValue);

    if (!match) {
        return 7 * 24 * 60 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2];

    if (unit === "s") return amount * 1000;
    if (unit === "m") return amount * 60 * 1000;
    if (unit === "h") return amount * 60 * 60 * 1000;
    return amount * 24 * 60 * 60 * 1000;
}

function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
}

function addMilliseconds(date: Date, milliseconds: number): Date {
    return new Date(date.getTime() + milliseconds);
}

function hashOpaqueToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

function generateOpaqueToken(): string {
    return randomBytes(32).toString("hex");
}

function mapUserToAuthUser(user: AuthUserLike): AuthUserResponse {
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

function createAccessTokenPayload(user: {
    id: string;
    email: string;
    role: UserRole;
}): AuthAccessTokenPayload {
    return {
        sub: user.id,
        email: user.email,
        role: user.role,
        tokenType: "access",
    };
}

function createRefreshTokenPayload(user: {
    id: string;
    email: string;
    role: UserRole;
}): AuthRefreshTokenPayload {
    return {
        sub: user.id,
        email: user.email,
        role: user.role,
        tokenType: "refresh",
    };
}

function signAccessToken(payload: AuthAccessTokenPayload): string {
    return jwt.sign(payload, getAccessTokenSecret(), {
        expiresIn: getAccessTokenExpiresIn(),
    });
}

function signRefreshToken(payload: AuthRefreshTokenPayload): string {
    return jwt.sign(payload, getRefreshTokenSecret(), {
        expiresIn: getRefreshTokenExpiresIn(),
    });
}

function parseAccessTokenPayload(payload: string | JwtPayload): AuthAccessTokenPayload | null {
    if (typeof payload === "string") {
        return null;
    }

    const subValue = payload.sub;
    const emailValue = payload.email;
    const roleValue = payload.role;
    const tokenTypeValue = payload.tokenType;

    if (typeof subValue !== "string") return null;
    if (typeof emailValue !== "string") return null;
    if (roleValue !== "USER" && roleValue !== "ADMIN") return null;
    if (tokenTypeValue !== "access") return null;

    return {
        sub: subValue,
        email: emailValue,
        role: roleValue,
        tokenType: "access",
    };
}

function parseRefreshTokenPayload(payload: string | JwtPayload): AuthRefreshTokenPayload | null {
    if (typeof payload === "string") {
        return null;
    }

    const subValue = payload.sub;
    const emailValue = payload.email;
    const roleValue = payload.role;
    const tokenTypeValue = payload.tokenType;

    if (typeof subValue !== "string") return null;
    if (typeof emailValue !== "string") return null;
    if (roleValue !== "USER" && roleValue !== "ADMIN") return null;
    if (tokenTypeValue !== "refresh") return null;

    return {
        sub: subValue,
        email: emailValue,
        role: roleValue,
        tokenType: "refresh",
    };
}

function createEmailVerificationToken(): TokenCreationResult {
    const plainToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(plainToken);
    const expiresAt = addMinutes(new Date(), getEmailVerificationTtlMinutes());

    return {
        plainToken,
        tokenHash,
        expiresAt,
    };
}

function createPasswordResetToken(): TokenCreationResult {
    const plainToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(plainToken);
    const expiresAt = addMinutes(new Date(), getPasswordResetTtlMinutes());

    return {
        plainToken,
        tokenHash,
        expiresAt,
    };
}

function buildDebugResponse(input: {
    emailVerificationToken?: string;
    passwordResetToken?: string;
}): { emailVerificationToken?: string; passwordResetToken?: string } | undefined {
    if (isProduction()) {
        return undefined;
    }

    const result: {
        emailVerificationToken?: string;
        passwordResetToken?: string;
    } = {};

    if (input.emailVerificationToken) {
        result.emailVerificationToken = input.emailVerificationToken;
    }

    if (input.passwordResetToken) {
        result.passwordResetToken = input.passwordResetToken;
    }

    if (!result.emailVerificationToken && !result.passwordResetToken) {
        return undefined;
    }

    return result;
}

async function persistRefreshToken(input: PersistRefreshTokenInput): Promise<void> {
    await RefreshTokenModel.create({
        userId: input.userId,
        tokenHash: hashOpaqueToken(input.refreshToken),
        expiresAt: input.expiresAt,
        revokedAt: null,
        replacedByTokenHash: null,
        lastUsedAt: null,
        ipAddress: input.meta?.ipAddress ?? null,
        userAgent: input.meta?.userAgent ?? null,
    });
}

async function issueAuthTokensForUser(
    user: {
        id: string;
        email: string;
        role: UserRole;
    },
    meta?: SessionMetaInput
): Promise<{
    accessToken: string;
    refreshToken: string;
}> {
    const accessToken = signAccessToken(
        createAccessTokenPayload({
            id: user.id,
            email: user.email,
            role: user.role,
        })
    );

    const refreshToken = signRefreshToken(
        createRefreshTokenPayload({
            id: user.id,
            email: user.email,
            role: user.role,
        })
    );

    await persistRefreshToken({
        userId: user.id,
        refreshToken,
        expiresAt: addMilliseconds(new Date(), getRefreshTokenTtlMs()),
        meta,
    });

    return {
        accessToken,
        refreshToken,
    };
}

async function revokeRefreshTokenDocument(input: {
    refreshTokenHash: string;
    replacedByTokenHash?: string | null;
}): Promise<void> {
    await RefreshTokenModel.updateOne(
        {
            tokenHash: input.refreshTokenHash,
            revokedAt: null,
        },
        {
            revokedAt: new Date(),
            replacedByTokenHash: input.replacedByTokenHash ?? null,
            lastUsedAt: new Date(),
        }
    );
}

async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
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

async function attachNewEmailVerificationToken(user: EmailVerificationTokenAttachable): Promise<string> {
    const verificationToken = createEmailVerificationToken();

    user.emailVerificationTokenHash = verificationToken.tokenHash;
    user.emailVerificationExpiresAt = verificationToken.expiresAt;

    await user.save();

    return verificationToken.plainToken;
}

export function verifyAccessTokenValue(token: string): AuthAccessTokenPayload | null {
    try {
        const decoded = jwt.verify(token, getAccessTokenSecret());
        return parseAccessTokenPayload(decoded);
    } catch {
        return null;
    }
}

export function verifyRefreshTokenValue(token: string): AuthRefreshTokenPayload | null {
    try {
        const decoded = jwt.verify(token, getRefreshTokenSecret());
        return parseRefreshTokenPayload(decoded);
    } catch {
        return null;
    }
}

export async function registerAuthService(
    input: RegisterPayload,
    meta?: SessionMetaInput
): Promise<ServiceResult<AuthSuccessResponse>> {
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
    const verificationToken = createEmailVerificationToken();

    const createdUser = await UserModel.create({
        fullName: input.fullName,
        email: input.email,
        passwordHash,
        phone: input.phone ?? null,
        avatarUrl: input.avatarUrl ?? null,
        role: "USER",
        isActive: true,
        isEmailVerified: false,
        emailVerificationTokenHash: verificationToken.tokenHash,
        emailVerificationExpiresAt: verificationToken.expiresAt,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        lastLoginAt: null,
    });

    const tokens = await issueAuthTokensForUser(
        {
            id: getDocumentId(createdUser),
            email: createdUser.email,
            role: createdUser.role,
        },
        meta
    );

    return {
        ok: true,
        data: {
            user: mapUserToAuthUser(createdUser),
            tokens,
            debug: buildDebugResponse({
                emailVerificationToken: verificationToken.plainToken,
            }),
        },
    };
}

export async function loginAuthService(
    input: LoginPayload,
    meta?: SessionMetaInput
): Promise<ServiceResult<AuthSuccessResponse>> {
    const user = await UserModel.findOne({ email: input.email });

    if (!user) {
        return {
            ok: false,
            error: {
                code: "INVALID_CREDENTIALS",
                message: "Invalid email or password",
            },
        };
    }

    if (!user.isActive) {
        return {
            ok: false,
            error: {
                code: "USER_INACTIVE",
                message: "User is inactive",
            },
        };
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
        return {
            ok: false,
            error: {
                code: "INVALID_CREDENTIALS",
                message: "Invalid email or password",
            },
        };
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await issueAuthTokensForUser(
        {
            id: getDocumentId(user),
            email: user.email,
            role: user.role,
        },
        meta
    );

    return {
        ok: true,
        data: {
            user: mapUserToAuthUser(user),
            tokens,
        },
    };
}

export async function refreshAuthService(
    input: RefreshTokenPayload,
    meta?: SessionMetaInput
): Promise<ServiceResult<AuthSuccessResponse>> {
    const tokenPayload = verifyRefreshTokenValue(input.refreshToken);

    if (!tokenPayload) {
        return {
            ok: false,
            error: {
                code: "INVALID_REFRESH_TOKEN",
                message: "Invalid refresh token",
            },
        };
    }

    const refreshTokenHash = hashOpaqueToken(input.refreshToken);

    const storedRefreshToken = await RefreshTokenModel.findOne({
        tokenHash: refreshTokenHash,
        revokedAt: null,
    });

    if (!storedRefreshToken) {
        return {
            ok: false,
            error: {
                code: "INVALID_REFRESH_TOKEN",
                message: "Invalid refresh token",
            },
        };
    }

    if (storedRefreshToken.expiresAt.getTime() <= Date.now()) {
        await revokeRefreshTokenDocument({
            refreshTokenHash,
            replacedByTokenHash: null,
        });

        return {
            ok: false,
            error: {
                code: "INVALID_REFRESH_TOKEN",
                message: "Refresh token expired",
            },
        };
    }

    const user = await UserModel.findById(tokenPayload.sub);

    if (!user) {
        return {
            ok: false,
            error: {
                code: "USER_NOT_FOUND",
                message: "User not found",
            },
        };
    }

    if (!user.isActive) {
        return {
            ok: false,
            error: {
                code: "USER_INACTIVE",
                message: "User is inactive",
            },
        };
    }

    const nextTokens = await issueAuthTokensForUser(
        {
            id: getDocumentId(user),
            email: user.email,
            role: user.role,
        },
        meta
    );

    await revokeRefreshTokenDocument({
        refreshTokenHash,
        replacedByTokenHash: hashOpaqueToken(nextTokens.refreshToken),
    });

    return {
        ok: true,
        data: {
            user: mapUserToAuthUser(user),
            tokens: nextTokens,
        },
    };
}

export async function logoutAuthService(
    input: LogoutPayload
): Promise<ServiceResult<LogoutResponse>> {
    const refreshTokenHash = hashOpaqueToken(input.refreshToken);

    await RefreshTokenModel.updateOne(
        {
            tokenHash: refreshTokenHash,
            revokedAt: null,
        },
        {
            revokedAt: new Date(),
            lastUsedAt: new Date(),
        }
    );

    return {
        ok: true,
        data: {
            message: "Logout successful",
        },
    };
}

export async function logoutAllAuthService(
    userId: string
): Promise<ServiceResult<LogoutAllResponse>> {
    await revokeAllRefreshTokensForUser(userId);

    return {
        ok: true,
        data: {
            message: "All sessions closed successfully",
        },
    };
}

export async function getCurrentAuthUserService(
    userId: string
): Promise<ServiceResult<AuthUserResponse>> {
    const user = await UserModel.findById(userId).select(
        "fullName email phone avatarUrl role isActive isEmailVerified lastLoginAt createdAt updatedAt"
    );

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
        data: mapUserToAuthUser(user),
    };
}

export async function updateMeAuthService(
    userId: string,
    input: UpdateMePayload
): Promise<ServiceResult<AuthUserResponse>> {
    const user = await UserModel.findById(userId);

    if (!user) {
        return {
            ok: false,
            error: {
                code: "USER_NOT_FOUND",
                message: "User not found",
            },
        };
    }

    if (typeof input.fullName !== "undefined") {
        user.fullName = input.fullName;
    }

    if (typeof input.phone !== "undefined") {
        user.phone = input.phone;
    }

    if (typeof input.avatarUrl !== "undefined") {
        user.avatarUrl = input.avatarUrl;
    }

    await user.save();

    return {
        ok: true,
        data: mapUserToAuthUser(user),
    };
}

export async function changePasswordAuthService(
    userId: string,
    input: ChangePasswordPayload
): Promise<ServiceResult<ChangePasswordResponse>> {
    const user = await UserModel.findById(userId);

    if (!user) {
        return {
            ok: false,
            error: {
                code: "USER_NOT_FOUND",
                message: "User not found",
            },
        };
    }

    const isCurrentPasswordValid = await bcrypt.compare(input.currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
        return {
            ok: false,
            error: {
                code: "PASSWORD_MISMATCH",
                message: "Current password is incorrect",
            },
        };
    }

    user.passwordHash = await bcrypt.hash(input.newPassword, 12);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;

    await user.save();
    await revokeAllRefreshTokensForUser(getDocumentId(user));

    return {
        ok: true,
        data: {
            message: "Password updated successfully",
            user: mapUserToAuthUser(user),
        },
    };
}

export async function forgotPasswordAuthService(
    input: ForgotPasswordPayload
): Promise<ServiceResult<ForgotPasswordResponse>> {
    const genericResponse: ForgotPasswordResponse = {
        message: "If the email exists, a password reset token has been generated",
    };

    const user = await UserModel.findOne({ email: input.email });

    if (!user || !user.isActive) {
        return {
            ok: true,
            data: genericResponse,
        };
    }

    const resetToken = createPasswordResetToken();

    user.passwordResetTokenHash = resetToken.tokenHash;
    user.passwordResetExpiresAt = resetToken.expiresAt;

    await user.save();

    return {
        ok: true,
        data: {
            ...genericResponse,
            debug: buildDebugResponse({
                passwordResetToken: resetToken.plainToken,
            }),
        },
    };
}

export async function resetPasswordAuthService(
    input: ResetPasswordPayload
): Promise<ServiceResult<MessageResponse>> {
    const tokenHash = hashOpaqueToken(input.token);

    const user = await UserModel.findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) {
        return {
            ok: false,
            error: {
                code: "INVALID_RESET_TOKEN",
                message: "Invalid or expired reset token",
            },
        };
    }

    user.passwordHash = await bcrypt.hash(input.newPassword, 12);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;

    await user.save();
    await revokeAllRefreshTokensForUser(getDocumentId(user));

    return {
        ok: true,
        data: {
            message: "Password reset successfully",
        },
    };
}

export async function verifyEmailAuthService(
    input: VerifyEmailPayload
): Promise<ServiceResult<VerifyEmailResponse>> {
    const tokenHash = hashOpaqueToken(input.token);

    const user = await UserModel.findOne({
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: { $gt: new Date() },
    });

    if (!user) {
        return {
            ok: false,
            error: {
                code: "INVALID_VERIFICATION_TOKEN",
                message: "Invalid or expired verification token",
            },
        };
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;

    await user.save();

    return {
        ok: true,
        data: {
            message: "Email verified successfully",
            user: mapUserToAuthUser(user),
        },
    };
}

export async function resendVerificationAuthService(
    input: ResendVerificationPayload
): Promise<ServiceResult<ResendVerificationResponse>> {
    const genericResponse: ResendVerificationResponse = {
        message: "If the email exists and is not verified, a verification token has been generated",
    };

    const user = await UserModel.findOne({ email: input.email });

    if (!user || user.isEmailVerified) {
        return {
            ok: true,
            data: genericResponse,
        };
    }

    const plainVerificationToken = await attachNewEmailVerificationToken(user);

    return {
        ok: true,
        data: {
            ...genericResponse,
            debug: buildDebugResponse({
                emailVerificationToken: plainVerificationToken,
            }),
        },
    };
}

export async function revokeAllUserSessionsService(userId: string): Promise<void> {
    await revokeAllRefreshTokensForUser(userId);
}