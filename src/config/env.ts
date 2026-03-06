// src/config/env.ts

import { z } from "zod";

function parseEnvBoolean(v: unknown): boolean | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "boolean") return v;

  const s = String(v).trim().toLowerCase();

  if (["true", "1", "yes", "y", "on"].includes(s)) return true;
  if (["false", "0", "no", "n", "off"].includes(s)) return false;

  return undefined;
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  PORT: z.coerce.number().int().positive().default(4000),

  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  MONGO_DB_NAME: z.string().min(1, "MONGO_DB_NAME is required"),

  EMAIL_VERIFICATION_TTL_MINUTES: z.coerce.number().int().positive().default(1440),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),

  ACCESS_TOKEN_SECRET: z.string().min(20, "ACCESS_TOKEN_SECRET must be at least 20 characters"),
  REFRESH_TOKEN_SECRET: z.string().min(20, "REFRESH_TOKEN_SECRET must be at least 20 characters"),

  ACCESS_TOKEN_EXPIRES_IN: z.string().min(1).default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().min(1).default("7d"),

  // Comma-separated origins
  CORS_ORIGINS: z.string().default("http://localhost:5173"),

  // Cookie settings
  // NOTE: Do NOT use z.coerce.boolean() here because strings like "false" can become true.
  COOKIE_SECURE: z.preprocess(parseEnvBoolean, z.boolean()).default(false),

  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),

  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),

  SCHEDULE_TZ_DEFAULT: z.string().default("America/Mexico_City"),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function getEnv(): AppEnv {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return `${path}: ${issue.message}`;
    });

    throw new Error(`Invalid environment variables:\n- ${issues.join("\n- ")}`);
  }

  return parsed.data;
}