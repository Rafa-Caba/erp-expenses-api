// src/users/routes/user.routes.ts

import { Router } from "express";

import {
    adminResetUserPasswordController,
    createUserController,
    deleteUserController,
    getUserByIdController,
    listUsersController,
    updateUserController,
} from "@/src/users/controllers/user.controller";
import { verifyAccessToken } from "@/src/auth/auth.middleware";
import { requireAdmin } from "@/src/middlewares/requireAdmin";

const userRouter = Router();

userRouter.use(verifyAccessToken, requireAdmin);

userRouter.get("/", listUsersController);
userRouter.get("/:id", getUserByIdController);
userRouter.post("/", createUserController);
userRouter.patch("/:id", updateUserController);
userRouter.patch("/:id/reset-password", adminResetUserPasswordController);
userRouter.delete("/:id", deleteUserController);

export default userRouter;