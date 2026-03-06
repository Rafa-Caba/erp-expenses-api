import type { RequestHandler } from "express";

import { authorizationHeaderSchema } from "@/src/auth/schemas/auth.schemas";
import { verifyAccessTokenValue } from "@/src/auth/services/auth.service";
import { UserModel } from "@/src/users/models/User.model";
import type { AuthenticatedUser } from "@/src/auth/types/auth.types";

type LocalsWithAuth = {
    auth?: AuthenticatedUser;
};

function extractBearerToken(authorizationHeader: string): string {
    return authorizationHeader.replace(/^Bearer\s+/i, "").trim();
}

export const verifyAccessToken: RequestHandler<
    Record<string, never>,
    object,
    object,
    object,
    LocalsWithAuth
> = async (req, res, next) => {
    const authorizationHeader = req.headers.authorization;

    const parsedHeader = authorizationHeaderSchema.safeParse(authorizationHeader);

    if (!parsedHeader.success) {
        return res.status(401).json({
            code: "UNAUTHORIZED",
            message: "Missing or invalid authorization header",
        });
    }

    const token = extractBearerToken(parsedHeader.data);
    const tokenPayload = verifyAccessTokenValue(token);

    if (!tokenPayload) {
        return res.status(401).json({
            code: "UNAUTHORIZED",
            message: "Invalid or expired access token",
        });
    }

    const user = await UserModel.findById(tokenPayload.sub).select("email role isActive");

    if (!user) {
        return res.status(401).json({
            code: "UNAUTHORIZED",
            message: "User no longer exists",
        });
    }

    if (!user.isActive) {
        return res.status(403).json({
            code: "FORBIDDEN",
            message: "User is inactive",
        });
    }

    res.locals.auth = {
        id: user.id,
        email: user.email,
        role: user.role,
    };

    return next();
};