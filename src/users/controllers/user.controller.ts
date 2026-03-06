import type { RequestHandler } from "express";
import { ZodError } from "zod";

import {
    createUserSchema,
    listUsersQuerySchema,
    updateUserSchema,
    userIdParamSchema,
} from "@/src/users/schemas/user.schema";
import {
    createUserService,
    deleteUserService,
    getUserByIdService,
    listUsersService,
    updateUserService,
} from "@/src/users/services/user.service";

function handleZodError(error: ZodError) {
    return {
        message: "Validation error",
        issues: error.flatten(),
    };
}

export const listUsersController: RequestHandler = (req, res, next) => {
    const parsedQuery = listUsersQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
        return res.status(400).json(handleZodError(parsedQuery.error));
    }

    return listUsersService(parsedQuery.data)
        .then((result) => {
            return res.status(200).json(result);
        })
        .catch(next);
};

export const getUserByIdController: RequestHandler = (req, res, next) => {
    const parsedParams = userIdParamSchema.safeParse(req.params);

    if (!parsedParams.success) {
        return res.status(400).json(handleZodError(parsedParams.error));
    }

    return getUserByIdService(parsedParams.data.id)
        .then((result) => {
            if (!result.ok) {
                return res.status(404).json(result.error);
            }

            return res.status(200).json(result.data);
        })
        .catch(next);
};

export const createUserController: RequestHandler = (req, res, next) => {
    const parsedBody = createUserSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json(handleZodError(parsedBody.error));
    }

    return createUserService(parsedBody.data)
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

export const updateUserController: RequestHandler = (req, res, next) => {
    const parsedParams = userIdParamSchema.safeParse(req.params);

    if (!parsedParams.success) {
        return res.status(400).json(handleZodError(parsedParams.error));
    }

    const parsedBody = updateUserSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json(handleZodError(parsedBody.error));
    }

    return updateUserService(parsedParams.data.id, parsedBody.data)
        .then((result) => {
            if (!result.ok) {
                if (result.error.code === "USER_NOT_FOUND") {
                    return res.status(404).json(result.error);
                }

                if (result.error.code === "EMAIL_ALREADY_IN_USE") {
                    return res.status(409).json(result.error);
                }

                return res.status(400).json(result.error);
            }

            return res.status(200).json(result.data);
        })
        .catch(next);
};

export const deleteUserController: RequestHandler = (req, res, next) => {
    const parsedParams = userIdParamSchema.safeParse(req.params);

    if (!parsedParams.success) {
        return res.status(400).json(handleZodError(parsedParams.error));
    }

    return deleteUserService(parsedParams.data.id)
        .then((result) => {
            if (!result.ok) {
                return res.status(404).json(result.error);
            }

            return res.status(200).json({
                message: "User deleted successfully",
                ...result.data,
            });
        })
        .catch(next);
};