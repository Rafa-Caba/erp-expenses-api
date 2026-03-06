// src/middlewares/verifyToken.ts

import type { RequestHandler } from "express";

import { authorizationHeaderSchema } from "@/src/auth/schemas/auth.schemas";
import { verifyAccessTokenValue } from "@/src/auth/services/auth.service";
import { UserModel } from "@/src/users/models/User.model";

function extractBearerToken(authorizationHeader: string): string {
    return authorizationHeader.replace(/^Bearer\s+/i, "").trim();
}

export const verifyToken: RequestHandler = async (req, res, next) => {
    const authorizationHeader = req.headers.authorization;

    const parsedHeader = authorizationHeaderSchema.safeParse(authorizationHeader);

    if (!parsedHeader.success) {
        res.status(401).json({
            code: "UNAUTHORIZED",
            message: "Missing or invalid authorization header",
        });
        return;
    }

    const token = extractBearerToken(parsedHeader.data);
    const tokenPayload = verifyAccessTokenValue(token);

    if (!tokenPayload) {
        res.status(401).json({
            code: "UNAUTHORIZED",
            message: "Invalid or expired access token",
        });
        return;
    }

    const user = await UserModel.findById(tokenPayload.sub).select("email role isActive");

    if (!user) {
        res.status(401).json({
            code: "UNAUTHORIZED",
            message: "User no longer exists",
        });
        return;
    }

    if (!user.isActive) {
        res.status(403).json({
            code: "FORBIDDEN",
            message: "User is inactive",
        });
        return;
    }

    req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
    };

    next();
};