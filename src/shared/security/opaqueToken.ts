// src/shared/security/opaqueToken.ts
import { createHash, randomBytes } from "node:crypto";

export interface OpaqueTokenResult {
    plainToken: string;
    tokenHash: string;
    expiresAt: Date;
}

export function hashOpaqueToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export function generateOpaqueToken(byteLength = 32): string {
    return randomBytes(byteLength).toString("hex");
}

export function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
}

export function createOpaqueTokenWithExpiry(ttlMinutes: number): OpaqueTokenResult {
    const plainToken = generateOpaqueToken();

    return {
        plainToken,
        tokenHash: hashOpaqueToken(plainToken),
        expiresAt: addMinutes(new Date(), ttlMinutes),
    };
}