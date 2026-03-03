// src/middlewares/requireAuth.ts

import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "@/src/auth/utils/jwt";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = String(req.headers.authorization ?? "");
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = verifyAccessToken(token);

    if (!decoded?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = { id: decoded.sub };
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
