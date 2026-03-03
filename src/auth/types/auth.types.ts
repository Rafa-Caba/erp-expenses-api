// src/auth/types/auth.types.ts

export type AuthTokens = {
  accessToken: string;
};

export type JwtAccessPayload = {
  sub: string; // userId
};

export type JwtRefreshPayload = {
  sub: string; // userId
  tid: string; // tokenId
};
