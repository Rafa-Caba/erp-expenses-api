// src/config/cors.ts

import type { CorsOptions } from "cors";
import { getEnv } from "@/src/config/env";

export function buildCorsOptions(): CorsOptions {
  const env = getEnv();
  const origins = env.CORS_ORIGIN.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    origin: origins.length ? origins : true,
    credentials: true,
  };
}
