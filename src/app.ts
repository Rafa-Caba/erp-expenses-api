// src/app.ts

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { buildCorsOptions } from "@/src/config/cors";

import authRouter from "./auth/routes/auth.routes";
import userRouter from "./users/routes/user.routes";

import { workspacesRouter } from "@/src/workspaces/routes/workspaces.routes";
import { accountRouter } from "@/src/accounts/routes/accounts.routes";
import { categoryRouter } from "@/src/categories/routes/categories.routes";
import { transactionRouter } from "@/src/transactions/routes/transactions.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(morgan("dev"));
  app.use(cors(buildCorsOptions()));

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);

  // Workspaces (existing)
  app.use("/api/workspaces", workspacesRouter);

  // Workspace-scoped modules
  app.use("/api/workspaces/:workspaceId/accounts", accountRouter);
  app.use("/api/workspaces/:workspaceId/categories", categoryRouter);
  app.use("/api/workspaces/:workspaceId/transactions", transactionRouter);

  app.use((_req, res) => res.status(404).json({ message: "Not Found" }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  });

  return app;
}