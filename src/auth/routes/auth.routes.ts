import { Router } from "express";

import {
    changePasswordAuthController,
    forgotPasswordAuthController,
    loginAuthController,
    logoutAllAuthController,
    logoutAuthController,
    meAuthController,
    refreshAuthController,
    registerAuthController,
    resendVerificationAuthController,
    resetPasswordAuthController,
    updateMeAuthController,
    verifyEmailAuthController,
} from "@/src/auth/controllers/auth.controller";
import { requireAdmin } from "@/src/middlewares/requireAdmin";
import { verifyAccessToken } from "@/src/auth/auth.middleware";

const authRouter = Router();

authRouter.post("/register", registerAuthController);
authRouter.post("/login", loginAuthController);
authRouter.post("/refresh", refreshAuthController);
authRouter.post("/logout", logoutAuthController);

authRouter.get("/me", verifyAccessToken, meAuthController);
authRouter.patch("/me", verifyAccessToken, updateMeAuthController);
authRouter.patch("/change-password", verifyAccessToken, changePasswordAuthController);
authRouter.post("/logout-all", verifyAccessToken, logoutAllAuthController);

authRouter.post("/forgot-password", forgotPasswordAuthController);
authRouter.post("/reset-password", resetPasswordAuthController);
authRouter.post("/verify-email", verifyEmailAuthController);
authRouter.post("/resend-verification-email", resendVerificationAuthController);

authRouter.get("/admin-check", verifyAccessToken, requireAdmin, (_req, res) => {
    return res.status(200).json({
        message: "Admin access granted",
    });
});

export default authRouter;