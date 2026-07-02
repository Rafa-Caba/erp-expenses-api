// src/middlewares/validateRequest.ts
// Express middleware for validating request body/params/query/headers with Zod.
// It returns the first validation issue as the main response message so the UI
// can show a user-friendly error instead of a generic "Validation failed" text.

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

function getValidationResponseMessage(errors: ValidationIssue[]): string {
    return errors[0]?.message ?? "Validation failed";
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
            const errors = mapZodIssues(parsed.error);

            res.status(400).json({
                code: "VALIDATION_ERROR",
                message: getValidationResponseMessage(errors),
                errors,
            });
            return;
        }

        next();
    };
}