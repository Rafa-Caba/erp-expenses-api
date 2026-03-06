// src/middlewares/validateRequest.ts

import type { RequestHandler } from "express";
import type { ZodError, ZodTypeAny } from "zod";

type ValidationIssue = {
    path: string;
    message: string;
    code: string;
};

function mapZodIssues(error: ZodError): ValidationIssue[] {
    return error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
    }));
}

export function validateRequest(schema: ZodTypeAny): RequestHandler {
    return async (req, res, next) => {
        const parsed = await schema.safeParseAsync({
            body: req.body,
            params: req.params,
            query: req.query,
            headers: req.headers,
        });

        if (!parsed.success) {
            res.status(400).json({
                code: "VALIDATION_ERROR",
                message: "Validation failed",
                errors: mapZodIssues(parsed.error),
            });
            return;
        }

        next();
    };
}