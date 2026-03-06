import type { UserRole } from "@/src/users/types/user.types";

export interface AuthAccessTokenPayload {
	sub: string;
	email: string;
	role: UserRole;
	tokenType: "access";
}

export interface AuthRefreshTokenPayload {
	sub: string;
	email: string;
	role: UserRole;
	tokenType: "refresh";
}

export interface AuthenticatedUser {
	id: string;
	email: string;
	role: UserRole;
}

export interface SessionMetaInput {
	ipAddress?: string | null;
	userAgent?: string | null;
}

export interface AuthTokens {
	accessToken: string;
	refreshToken: string;
}

export interface AuthUserResponse {
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

export interface AuthDebugResponse {
	emailVerificationToken?: string;
	passwordResetToken?: string;
}

export interface LoginPayload {
	email: string;
	password: string;
}

export interface RegisterPayload {
	fullName: string;
	email: string;
	password: string;
	phone?: string | null;
	avatarUrl?: string | null;
}

export interface RefreshTokenPayload {
	refreshToken: string;
}

export interface LogoutPayload {
	refreshToken: string;
}

export interface UpdateMePayload {
	fullName?: string;
	phone?: string | null;
	avatarUrl?: string | null;
}

export interface ChangePasswordPayload {
	currentPassword: string;
	newPassword: string;
}

export interface ForgotPasswordPayload {
	email: string;
}

export interface ResetPasswordPayload {
	token: string;
	newPassword: string;
}

export interface VerifyEmailPayload {
	token: string;
}

export interface ResendVerificationPayload {
	email: string;
}

export interface AuthSuccessResponse {
	user: AuthUserResponse;
	tokens: AuthTokens;
	debug?: AuthDebugResponse;
}

export interface MessageResponse {
	message: string;
}

export interface ForgotPasswordResponse extends MessageResponse {
	debug?: AuthDebugResponse;
}

export interface ResendVerificationResponse extends MessageResponse {
	debug?: AuthDebugResponse;
}

export interface VerifyEmailResponse extends MessageResponse {
	user: AuthUserResponse;
}

export interface ChangePasswordResponse extends MessageResponse {
	user: AuthUserResponse;
}

export interface LogoutResponse extends MessageResponse { }

export interface LogoutAllResponse extends MessageResponse { }

export interface AuthenticatedUser {
	id: string;
	email: string;
	role: UserRole;
}

export type AuthenticatedLocals = {
	auth?: AuthenticatedUser;
};