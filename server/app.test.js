import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "./auth.js";
import { createApp } from "./app.js";

const sessionSecret = "test-session-secret-with-enough-entropy";
let passwordHash;

const attempts = new Map();
const attemptModel = {
  findById(id) { return { lean: async () => attempts.get(id) || null }; },
  async findOneAndUpdate(filter, update) {
    const value = attempts.get(filter._id) || { _id: filter._id, failures: 0 };
    value.failures += update.$inc.failures;
    value.expiresAt = update.$set.expiresAt;
    attempts.set(filter._id, value);
  },
  async deleteOne(filter) { attempts.delete(filter._id); },
};

beforeAll(async () => { passwordHash = await hashPassword("correct horse battery staple"); });

describe("API authentication boundary", () => {
  const app = () => createApp({ connect: async () => {}, workspaceModel: {}, loginAttemptModel: attemptModel, passwordHash, sessionSecret });

  it("exposes health but protects workspace data", async () => {
    await request(app()).get("/api/health").expect(200, { ok: true });
    await request(app()).get("/api/workspace").expect(401);
  });

  it("logs in, verifies the session, and logs out", async () => {
    const instance = app();
    await request(instance).post("/api/auth/login").send({ password: "wrong" }).expect(401);
    const login = await request(instance).post("/api/auth/login").send({ password: "correct horse battery staple" }).expect(204);
    const cookie = login.headers["set-cookie"][0];
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    await request(instance).get("/api/auth/session").set("cookie", cookie).expect(204);
    const signedOut = await request(instance).post("/api/auth/logout").set("cookie", cookie).expect(204);
    expect(signedOut.headers["set-cookie"][0]).toContain("Expires=Thu, 01 Jan 1970");
  });

  it("rejects cross-origin mutation requests", async () => {
    await request(app()).post("/api/auth/login").set("origin", "https://attacker.example").set("host", "onionmap.example").send({ password: "correct horse battery staple" }).expect(403);
  });

  it("throttles repeated failed logins", async () => {
    attempts.clear();
    const instance = app();
    for (let count = 0; count < 10; count += 1)
      await request(instance).post("/api/auth/login").send({ password: "wrong" }).expect(401);
    await request(instance).post("/api/auth/login").send({ password: "wrong" }).expect(429);
  });
});
