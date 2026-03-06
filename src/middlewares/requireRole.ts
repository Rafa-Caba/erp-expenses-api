// src/middlewares/requireRole.ts

import type { NextFunction, Request, Response } from "express";

import type { MemberRole } from "@/src/shared/types/common";

export function requireRole(...roles: MemberRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.workspaceMember?.role;

    if (!role) {
      res.status(403).json({
        code: "WORKSPACE_ROLE_MISSING",
        message: "Forbidden",
      });
      return;
    }

    if (!roles.includes(role)) {
      res.status(403).json({
        code: "WORKSPACE_ROLE_FORBIDDEN",
        message: "Forbidden",
      });
      return;
    }

    next();
  };
}