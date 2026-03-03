// src/config/db.ts

import mongoose from "mongoose";

export async function connectDb(mongoUri: string): Promise<void> {
  if (!mongoUri) {
    throw new Error("Missing MONGO_URI");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(mongoUri);

  // Optional: basic logging
  // eslint-disable-next-line no-console
  console.log("✅ MongoDB connected");
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
