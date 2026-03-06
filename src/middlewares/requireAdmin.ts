import type { RequestHandler } from "express";
import type { AuthenticatedUser } from "@/src/auth/types/auth.types";

type LocalsWithAuth = {
    auth?: AuthenticatedUser;
};

export const requireAdmin: RequestHandler<
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

    if (auth.role !== "ADMIN") {
        return res.status(403).json({
            code: "FORBIDDEN",
            message: "Admin access required",
        });
    }

    return next();
};