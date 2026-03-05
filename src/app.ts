// src/app.ts

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { buildCorsOptions } from "@/src/config/cors";
import { authRouter } from "@/src/auth/routes/auth.routes";
import { workspacesRouter } from "@/src/workspaces/routes/workspaces.routes";

import { accountsRouter } from "@/src/accounts/routes/accounts.routes";
import { categoriesRouter } from "@/src/categories/routes/categories.routes";
import { transactionsRouter } from "@/src/transactions/routes/transactions.routes";
import { summaryRouter } from "@/src/summary/routes/summary.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(morgan("dev"));
  app.use(cors(buildCorsOptions()));

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);

  // Workspaces (existing)
  app.use("/api/workspaces", workspacesRouter);

  // Workspace-scoped modules
  app.use("/api/workspaces/:workspaceId/accounts", accountsRouter);
  app.use("/api/workspaces/:workspaceId/categories", categoriesRouter);
  app.use("/api/workspaces/:workspaceId/transactions", transactionsRouter);
  app.use("/api/workspaces/:workspaceId/summary", summaryRouter);

  app.use((_req, res) => res.status(404).json({ message: "Not Found" }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  });

  return app;
}