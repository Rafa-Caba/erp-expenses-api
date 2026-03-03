// src/auth/schemas/auth.schemas.ts

import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});

export const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});
