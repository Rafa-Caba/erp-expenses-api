// src/middlewares/requireRole.ts

import type { NextFunction, Request, Response } from "express";
import type { MemberRole } from "@/src/shared/types/common";

export function requireRole(...roles: MemberRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.workspaceMember?.role;
    if (!role) return res.status(403).json({ message: "Forbidden" });

    if (!roles.includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
}
