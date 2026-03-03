// src/auth/utils/jwt.ts

import jwt from "jsonwebtoken";
import crypto from "crypto";
import type {
  JwtAccessPayload,
  JwtRefreshPayload,
} from "@/src/auth/types/auth.types";

const ACCESS_EXPIRES_IN = "7d";
const REFRESH_EXPIRES_IN = "30d"; // típico; si quieres 7d también lo cambiamos

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function signAccessToken(userId: string): string {
  const secret = mustEnv("JWT_ACCESS_SECRET");
  const payload: JwtAccessPayload = { sub: userId };
  return jwt.sign(payload, secret, { expiresIn: ACCESS_EXPIRES_IN });
}

export function signRefreshToken(userId: string, tokenId: string): string {
  const secret = mustEnv("JWT_REFRESH_SECRET");
  const payload: JwtRefreshPayload = { sub: userId, tid: tokenId };
  return jwt.sign(payload, secret, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  const secret = mustEnv("JWT_ACCESS_SECRET");
  return jwt.verify(token, secret) as JwtAccessPayload;
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  const secret = mustEnv("JWT_REFRESH_SECRET");
  return jwt.verify(token, secret) as JwtRefreshPayload;
}

export function generateTokenId(): string {
  return crypto.randomUUID();
}

export function hashToken(raw: string): string {
  // sha256 is enough here; store only hash
  return crypto.createHash("sha256").update(raw).digest("hex");
}
