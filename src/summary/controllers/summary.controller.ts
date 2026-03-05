// src/summary/controllers/summary.controller.ts

import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { getWorkspaceSummary } from "@/src/summary/services/summary.service";

function getWorkspaceAccess(req: Request) {
    const anyReq = req as any;
    const role = (anyReq.workspaceAccess?.role ?? "MEMBER") as any;
    const workspaceKind = (anyReq.workspaceAccess?.workspaceKind ?? "SHARED") as any;
    return { role, workspaceKind };
}

export async function handleGetWorkspaceSummary(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user?.id as string | undefined;
        const workspaceId = String(req.params.workspaceId ?? "");

        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        if (!mongoose.isValidObjectId(workspaceId)) return res.status(400).json({ message: "Invalid workspaceId" });

        const { role, workspaceKind } = getWorkspaceAccess(req);

        const data = await getWorkspaceSummary({
            workspaceId,
            actorUserId: userId,
            role,
            workspaceKind,
        });

        return res.json(data);
    } catch (err) {
        return next(err);
    }
}