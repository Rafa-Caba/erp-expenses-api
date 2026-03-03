// src/auth/services/auth.service.ts

import bcrypt from "bcrypt";
import type { Request } from "express";
import mongoose from "mongoose";

import { UserModel } from "@/src/users/models/User.model";
import { RefreshTokenModel } from "@/src/auth/models/RefreshToken.model";
import { WorkspaceModel } from "@/src/workspaces/models/Workspace.model";
import { WorkspaceMemberModel } from "@/src/workspaces/models/WorkspaceMember.model";

import {
  generateTokenId,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/src/auth/utils/jwt";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getClientIp(req: Request): string | null {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.socket?.remoteAddress ?? null;
}

function buildPersonalWorkspaceName(userName: string): string {
  const name = String(userName ?? "")
    .trim()
    .replace(/\s+/g, " ");
  return `${name} - Personal`;
}

export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
}) {
  const email = normalizeEmail(params.email);

  const exists = await UserModel.findOne({ email });
  if (exists) {
    const e = new Error("Email already in use");
    (e as any).status = 409;
    throw e;
  }

  const passwordHash = await bcrypt.hash(params.password, 10);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1) Create user
    const user = await UserModel.create(
      [
        {
          name: params.name,
          email,
          passwordHash,
          defaultCurrency: "MXN",
          timezone: "America/Mexico_City",
          lastLoginAt: null,
        },
      ],
      { session }
    );

    const createdUser = user[0];
    const createdUserId = String((createdUser as any)._id);

    // 2) Create INDIVIDUAL workspace: "{name} - Personal"
    const personalWorkspace = await WorkspaceModel.create(
      [
        {
          name: buildPersonalWorkspaceName(createdUser.name),
          kind: "INDIVIDUAL",
          currencyDefault: "MXN",
          timezone: createdUser.timezone ?? "America/Mexico_City",
          createdByUserId: createdUserId,
          updatedByUserId: null,
          isActive: true,
        },
      ],
      { session }
    );

    const createdWorkspace = personalWorkspace[0];

    // 3) Create membership OWNER
    await WorkspaceMemberModel.create(
      [
        {
          workspaceId: (createdWorkspace as any)._id,
          userId: (createdUser as any)._id,
          role: "OWNER",
          status: "active",
          createdByUserId: (createdUser as any)._id,
          updatedByUserId: null,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return createdUser;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function loginUser(params: {
  email: string;
  password: string;
  req: Request;
}) {
  const email = normalizeEmail(params.email);

  const user = await UserModel.findOne({ email });
  if (!user) {
    const e = new Error("Invalid credentials");
    (e as any).status = 401;
    throw e;
  }

  const ok = await bcrypt.compare(params.password, user.passwordHash);
  if (!ok) {
    const e = new Error("Invalid credentials");
    (e as any).status = 401;
    throw e;
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokenId = generateTokenId();
  const refreshToken = signRefreshToken(String((user as any)._id), tokenId);
  const refreshHash = hashToken(refreshToken);

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await RefreshTokenModel.create({
    userId: (user as any)._id,
    tokenHash: refreshHash,
    tokenId,
    revokedAt: null,
    expiresAt,
    createdAtIp: getClientIp(params.req),
    userAgent: String(params.req.headers["user-agent"] ?? ""),
  });

  const accessToken = signAccessToken(String((user as any)._id));

  return { user, accessToken, refreshToken };
}

export async function refreshSession(params: {
  refreshToken: string;
  req: Request;
}) {
  const payload = verifyRefreshToken(params.refreshToken);

  const userId = payload.sub;
  const tokenId = payload.tid;

  const tokenHash = hashToken(params.refreshToken);

  const record = await RefreshTokenModel.findOne({
    userId,
    tokenId,
    tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    const e = new Error("Invalid refresh token");
    (e as any).status = 401;
    throw e;
  }

  // Rotation
  record.revokedAt = new Date();
  await record.save();

  const newTokenId = generateTokenId();
  const newRefreshToken = signRefreshToken(userId, newTokenId);
  const newHash = hashToken(newRefreshToken);

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await RefreshTokenModel.create({
    userId,
    tokenHash: newHash,
    tokenId: newTokenId,
    revokedAt: null,
    expiresAt,
    createdAtIp: getClientIp(params.req),
    userAgent: String(params.req.headers["user-agent"] ?? ""),
  });

  const accessToken = signAccessToken(userId);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logoutSession(params: { refreshToken: string }) {
  try {
    const payload = verifyRefreshToken(params.refreshToken);
    const tokenHash = hashToken(params.refreshToken);

    await RefreshTokenModel.updateOne(
      { userId: payload.sub, tokenId: payload.tid, tokenHash, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  } catch {
    // idempotent logout
  }
}
