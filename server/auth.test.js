import { describe, expect, it } from "vitest";
import { createSessionToken, hashPassword, verifyPassword, verifySessionToken } from "./auth.js";

describe("authentication primitives", () => {
  it("hashes and verifies a password without storing it", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("rejects expired and tampered session cookies", () => {
    const secret = "a-long-test-secret-that-is-not-production";
    const token = createSessionToken(secret, 1_000);
    expect(verifySessionToken(token, secret, 2_000)).toBe(true);
    expect(verifySessionToken(`${token}x`, secret, 2_000)).toBe(false);
    expect(verifySessionToken(token, secret, 1_000 + 31 * 24 * 60 * 60 * 1000)).toBe(false);
  });
});
