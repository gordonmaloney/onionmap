import { createHash, randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import express from "express";
import { z } from "zod";
import { clearSessionCookie, setSessionCookie, verifyPassword, verifySessionToken } from "./auth.js";
import { COOKIE_NAME } from "./config.js";
import { connectDatabase, LoginAttemptModel, WorkspaceModel } from "./db.js";
import { saveSchema } from "./schema.js";
import { getOrCreateWorkspace, saveWorkspace } from "./workspace.js";

const loginSchema = z.object({ password: z.string().min(1).max(500) });
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 10;

const requestOrigin = (req) =>
  `${req.get("x-forwarded-proto") || req.protocol}://${req.get("x-forwarded-host") || req.get("host")}`;

export function createApp(options = {}) {
  const app = express();
  const connect = options.connect || connectDatabase;
  const Workspace = options.workspaceModel || WorkspaceModel;
  const Attempts = options.loginAttemptModel || LoginAttemptModel;
  const passwordHash = options.passwordHash ?? process.env.ONIONMAP_PASSWORD_HASH;
  const sessionSecret = options.sessionSecret ?? process.env.ONIONMAP_SESSION_SECRET;

  app.disable("x-powered-by");
  app.use((req, res, next) => {
    req.requestId = req.get("x-request-id")?.slice(0, 100) || randomUUID();
    res.setHeader("x-request-id", req.requestId);
    res.setHeader("cache-control", "no-store");
    next();
  });
  app.get("/api/health", async (_req, res) => {
    try {
      await connect();
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });
  app.use(express.json({ limit: "4mb" }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    const origin = req.get("origin");
    if (!origin || origin === requestOrigin(req)) return next();
    return res.status(403).json({ error: "forbidden", requestId: req.requestId });
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      if (!passwordHash || !sessionSecret) throw new Error("Authentication is not configured");
      await connect();
      const { password } = loginSchema.parse(req.body);
      const attemptId = createHash("sha256")
        .update(`${sessionSecret}:${req.ip || "unknown"}`)
        .digest("hex");
      const attempt = await Attempts.findById(attemptId).lean();
      if (attempt && attempt.expiresAt > new Date() && attempt.failures >= MAX_LOGIN_FAILURES) {
        res.setHeader("retry-after", "900");
        return res.status(429).json({ error: "try_again_later", requestId: req.requestId });
      }
      if (!(await verifyPassword(password, passwordHash))) {
        await Attempts.findOneAndUpdate(
          { _id: attemptId },
          { $inc: { failures: 1 }, $set: { expiresAt: new Date(Date.now() + LOGIN_WINDOW_MS) } },
          { upsert: true, setDefaultsOnInsert: true },
        );
        return res.status(401).json({ error: "invalid_credentials", requestId: req.requestId });
      }
      await Attempts.deleteOne({ _id: attemptId });
      setSessionCookie(res, sessionSecret);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  const requireAuth = (req, res, next) => {
    if (!sessionSecret || !verifySessionToken(req.cookies?.[COOKIE_NAME], sessionSecret))
      return res.status(401).json({ error: "unauthorized", requestId: req.requestId });
    next();
  };

  app.get("/api/auth/session", requireAuth, (_req, res) => res.status(204).end());
  app.post("/api/auth/logout", (_req, res) => {
    clearSessionCookie(res);
    res.status(204).end();
  });

  app.use("/api/workspace", requireAuth, async (_req, _res, next) => {
    try {
      await connect();
      next();
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/workspace", async (_req, res, next) => {
    try {
      const workspace = await getOrCreateWorkspace(Workspace);
      res.json({ revision: workspace.revision, updatedAt: workspace.updatedAt, snapshot: workspace.snapshot });
    } catch (error) {
      next(error);
    }
  });
  app.put("/api/workspace", async (req, res, next) => {
    try {
      const input = saveSchema.parse(req.body);
      const result = await saveWorkspace(Workspace, input);
      if (result.kind === "conflict")
        return res.status(409).json({ error: "revision_conflict", currentRevision: result.currentRevision, requestId: req.requestId });
      res.json({ revision: result.revision, saveId: input.saveId, idempotent: result.idempotent, updatedAt: result.updatedAt });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api", (req, res) => res.status(404).json({ error: "not_found", requestId: req.requestId }));
  app.use((error, req, res, _next) => {
    if (error instanceof z.ZodError)
      return res.status(400).json({ error: "invalid_data", issues: error.issues, requestId: req.requestId });
    const status = Number(error?.status) || (error?.type === "entity.too.large" ? 413 : 500);
    if (status === 500) console.error("request_failed", { requestId: req.requestId, message: error instanceof Error ? error.message : "unknown" });
    res.status(status).json({ error: status === 413 ? "payload_too_large" : "internal_error", requestId: req.requestId });
  });
  return app;
}

export const app = createApp();
