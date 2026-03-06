import type { RequestHandler } from "express";
import { ZodError } from "zod";

import {
    changePasswordSchema,
    forgotPasswordSchema,
    loginSchema,
    logoutSchema,
    refreshTokenSchema,
    registerSchema,
    resendVerificationSchema,
    resetPasswordSchema,
    updateMeSchema,
    verifyEmailSchema,
} from "@/src/auth/schemas/auth.schemas";
import {
    changePasswordAuthService,
    forgotPasswordAuthService,
    getCurrentAuthUserService,
    loginAuthService,
    logoutAllAuthService,
    logoutAuthService,
    refreshAuthService,
    registerAuthService,
    resendVerificationAuthService,
    resetPasswordAuthService,
    updateMeAuthService,
    verifyEmailAuthService,
} from "@/src/auth/services/auth.service";
import type { AuthenticatedUser } from "@/src/auth/types/auth.types";

type LocalsWithAuth = {
    auth?: AuthenticatedUser;
};

function handleZodError(error: ZodError) {
    return {
        message: "Validation error",
        issues: error.flatten(),
    };
}

function getSessionMeta(req: {
    ip?: string;
    get: (name: string) => string | undefined;
}): {
    ipAddress?: string | null;
    userAgent?: string | null;
} {
    return {
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
    };
}

export const registerAuthController: RequestHandler = (req, res, next) => {
    const parsedBody = registerSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json(handleZodError(parsedBody.error));
    }

    return registerAuthService(parsedBody.data, getSessionMeta(req))
        .then((result) => {
            if (!result.ok) {
                if (result.error.code === "EMAIL_ALREADY_IN_USE") {
                    return res.status(409).json(result.error);
                }

                return res.status(400).json(result.error);
            }

            return res.status(201).json(result.data);
        })
        .catch(next);
};

export const loginAuthController: RequestHandler = (req, res, next) => {
    const parsedBody = loginSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json(handleZodError(parsedBody.error));
    }

    return loginAuthService(parsedBody.data, getSessionMeta(req))
        .then((result) => {
            if (!result.ok) {
                if (result.error.code === "INVALID_CREDENTIALS") {
                    return res.status(401).json(result.error);
                }

                if (result.error.code === "USER_INACTIVE") {
                    return res.status(403).json(result.error);
                }

                return res.status(400).json(result.error);
            }

            return res.status(200).json(result.data);
        })
        .catch(next);
};

export const refreshAuthController: RequestHandler = (req, res, next) => {
    const parsedBody = refreshTokenSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json(handleZodError(parsedBody.error));
    }

    return refreshAuthService(parsedBody.data, getSessionMeta(req))
        .then((result) => {
            if (!result.ok) {
                if (result.error.code === "INVALID_REFRESH_TOKEN") {
                    return res.status(401).json(result.error);
                }

                if (result.error.code === "USER_NOT_FOUND") {
                    return res.status(404).json(result.error);
                }

                if (result.error.code === "USER_INACTIVE") {
                    return res.status(403).json(result.error);
                }

                return res.status(400).json(result.error);
            }

            return res.status(200).json(result.data);
        })
        .catch(next);
};

export const logoutAuthController: RequestHandler = (req, res, next) => {
    const parsedBody = logoutSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json(handleZodError(parsedBody.error));
    }

    return logoutAuthService(parsedBody.data)
        .then((result) => {
            if (!result.ok) {
                return res.status(400).json(result.error);
            }

            return res.status(200).json(result.data);
        })
        .catch(next);
};

export const logoutAllAuthController: RequestHandler<
    Record<string, never>,
    object,
    object,
    object,
    LocalsWithAuth
> = (_req, res, next) => {
    const auth = res.locals.auth;

    if (!auth) {
        return res.status(401).json({
            code: "UNAUTHORIZED",
            message: "Unauthorized",
        });
    }

    return logoutAllAuthService(auth.id)
        .then((result) => {
            if (!result.ok) {
                return res.status(400).json(result.error);
            }

            return res.status(200).json(result.data);
        })
        .catch(next);
};

export const meAuthController: RequestHandler<
    Record<string, never>,
    object,
    object,
    object,
    LocalsWithAuth
> = (_req, res, next) => {
    const auth = res.locals.auth;

    if (!auth) {
        return res.status(401).json({
            code: "UNAUTHORIZED",
            message: "Unauthorized",
        });
    }

    return getCurrentAuthUserService(auth.id)
        .then((result) => {
            if (!result.ok) {
                if (result.error.code === "USER_NOT_FOUND") {
                    return res.status(404).json(result.error);
                }

                return res.status(400).json(result.error);
            }

            return res.status(200).json(result.data);
        })
        .catch(next);
};

export const updateMeAuthController: RequestHandler<
    Record<string, never>,
    object,
    object,
    object,
    LocalsWithAuth
> = (req, res, next) => {
    const auth = res.locals.auth;

    if (!auth) {
        return res.status(401).json({
            code: "UNAUTHORIZED",
            message: "Unauthorized",
        });
    }

    const parsedBody = updateMeSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json(handleZodError(parsedBody.error));
    }

    return updateMeAuthService(auth.id, parsedBody.data)
        .then((result) => {
            if (!result.ok) {
                if (result.error.code === "USER_NOT_FOUND") {
                    return res.status(404).json(result.error);
                }

                return res.status(400).json(result.error);
            }

            return res.status(200).json(result.data);
        })
        .catch(next);
};

export const changePasswordAuthController: RequestHandler<
    Record<string, never>,
    object,
    object,
    object,
    LocalsWithAuth
> = (req, res, next) => {
    const auth = res.locals.auth;

    if (!auth) {
        return res.status(401).json({
            code: "UNAUTHORIZED",
            message: "Unauthorized",
        });
    }

    const parsedBody = changePasswordSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json(handleZodError(parsedBody.error));
    }

    return changePasswordAuthService(auth.id, parsedBody.data)
        .then((result) => {
            if (!result.ok) {
                if (result.error.code === "USER_NOT_FOUND") {
                    return res.status(404).json(result.error);
                }

                if (result.error.code === "PASSWORD_MISMATCH") {
                    return res.status(400).json(result.error);
                }

                return res.status(400).json(result.error);
            }

            return res.status(200).json(result.data);
        })
        .catch(next);
};

export const forgotPasswordAuthController: RequestHandler = (req, res, next) => {
    const parsedBody = forgotPasswordSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json(handleZodError(parsedBody.error));
    }

    return forgotPasswordAuthService(parsedBody.data)
        .then((result) => {
            if (!result.ok) {
                return res.status(400).json(result.error);
            }

            return res.status(200).json(result.data);
        })
        .catch(next);
};

export const resetPasswordAuthController: RequestHandler = (req, res, next) => {
    const parsedBody = resetPasswordSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json(handleZodError(parsedBody.error));
    }

    return resetPasswordAuthService(parsedBody.data)
        .then((result) => {
            if (!result.ok) {
                if (result.error.code === "INVALID_RESET_TOKEN") {
                    return res.status(400).json(result.error);
                }

                return res.status(400).json(result.error);
            }

            return res.status(200).json(result.data);
        })
        .catch(next);
};

export const verifyEmailAuthController: RequestHandler = (req, res, next) => {
    const parsedBody = verifyEmailSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json(handleZodError(parsedBody.error));
    }

    return verifyEmailAuthService(parsedBody.data)
        .then((result) => {
            if (!result.ok) {
                if (result.error.code === "INVALID_VERIFICATION_TOKEN") {
                    return res.status(400).json(result.error);
                }

                return res.status(400).json(result.error);
            }

            return res.status(200).json(result.data);
        })
        .catch(next);
};

export const resendVerificationAuthController: RequestHandler = (req, res, next) => {
    const parsedBody = resendVerificationSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json(handleZodError(parsedBody.error));
    }

    return resendVerificationAuthService(parsedBody.data)
        .then((result) => {
            if (!result.ok) {
                return res.status(400).json(result.error);
            }

            return res.status(200).json(result.data);
        })
        .catch(next);
};