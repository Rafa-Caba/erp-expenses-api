// src/auth/controllers/auth.controller.ts

import type { Request, Response, NextFunction } from "express";
import { LoginSchema, RegisterSchema } from "@/src/auth/schemas/auth.schemas";
import {
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
} from "@/src/auth/services/auth.service";
import { getEnv } from "@/src/config/env";

function setRefreshCookie(res: Response, token: string) {
  const env = getEnv();

  res.cookie("refreshToken", token, {
    httpOnly: true,
    sameSite: env.COOKIE_SAME_SITE,
    secure: env.COOKIE_SECURE,
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response) {
  const env = getEnv();

  res.clearCookie("refreshToken", {
    path: "/api/auth",
    sameSite: env.COOKIE_SAME_SITE,
    secure: env.COOKIE_SECURE,
  });
}

export async function handleRegister(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ message: "Invalid body", issues: parsed.error.issues });

    const user = await registerUser(parsed.data);

    // return safe user
    const json = user.toJSON();
    delete (json as any).passwordHash;

    return res.status(201).json(json);
  } catch (err: any) {
    const status = Number(err?.status ?? 500);
    if (status !== 500)
      return res.status(status).json({ message: err.message });
    return next(err);
  }
}

export async function handleLogin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ message: "Invalid body", issues: parsed.error.issues });

    const { user, accessToken, refreshToken } = await loginUser({
      email: parsed.data.email,
      password: parsed.data.password,
      req,
    });

    setRefreshCookie(res, refreshToken);

    const json = user.toJSON();
    delete (json as any).passwordHash;

    return res.json({ user: json, accessToken });
  } catch (err: any) {
    const status = Number(err?.status ?? 500);
    if (status !== 500)
      return res.status(status).json({ message: err.message });
    return next(err);
  }
}

export async function handleRefresh(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = String(req.cookies?.refreshToken ?? "");
    if (!token)
      return res.status(401).json({ message: "Missing refresh token" });

    const { accessToken, refreshToken } = await refreshSession({
      refreshToken: token,
      req,
    });

    setRefreshCookie(res, refreshToken);

    return res.json({ accessToken });
  } catch (err: any) {
    const status = Number(err?.status ?? 500);
    if (status !== 500)
      return res.status(status).json({ message: err.message });
    return next(err);
  }
}

export async function handleLogout(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = String(req.cookies?.refreshToken ?? "");
    if (token) {
      await logoutSession({ refreshToken: token });
    }

    clearRefreshCookie(res);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}
