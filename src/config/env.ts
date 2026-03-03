// src/config/env.ts

import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URI: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(20),
  JWT_REFRESH_SECRET: z.string().min(20),

  // Comma-separated origins
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Cookie settings
  COOKIE_SECURE: z.coerce.boolean().default(false), // true in prod (HTTPS)
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function getEnv(): AppEnv {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    );
    throw new Error(`Invalid environment variables:\n- ${issues.join("\n- ")}`);
  }
  return parsed.data;
}
