// src/auth/routes/auth.routes.ts

import { Router } from "express";
import {
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
} from "@/src/auth/controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/register", handleRegister);
authRouter.post("/login", handleLogin);
authRouter.post("/refresh", handleRefresh);
authRouter.post("/logout", handleLogout);
