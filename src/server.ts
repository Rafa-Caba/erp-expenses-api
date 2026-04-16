// src/server.ts

import dotenv from "dotenv";

import { createApp } from "@/src/app";
import { connectDb } from "@/src/config/db";
import { getEnv } from "@/src/config/env";
import { bootstrapThemesForAllWorkspaces } from "@/src/themes/bootstrap/theme.bootstrap";

dotenv.config();

async function main() {
  const env = getEnv();

  await connectDb(env.MONGO_URI);
  await bootstrapThemesForAllWorkspaces();

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`🚀 API running on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});