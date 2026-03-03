// src/server.ts

import dotenv from "dotenv";
import { createApp } from "@/src/app";
import { connectDb } from "@/src/config/db";
import { getEnv } from "@/src/config/env";

dotenv.config();

async function main() {
  const env = getEnv();

  const app = createApp();

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 API running on http://localhost:${env.PORT}`);
  });

  connectDb(env.MONGO_URI).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("❌ MongoDB connection failed:", err?.message ?? err);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
