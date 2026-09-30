import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { COOKIE_NAME, SESSION_DURATION_MS } from "./config.js";

const scrypt = promisify(scryptCallback);

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 16)
    throw new Error("password_too_short");
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
}

export async function verifyPassword(password, encoded) {
  try {
    const [algorithm, saltText, hashText] = String(encoded).split("$");
    if (algorithm !== "scrypt" || !saltText || !hashText) return false;
    const expected = Buffer.from(hashText, "base64url");
    const actual = Buffer.from(
      await scrypt(String(password), Buffer.from(saltText, "base64url"), expected.length),
    );
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

const signature = (expiresAt, secret) =>
  createHmac("sha256", secret).update(`onionmap:${expiresAt}`).digest("base64url");

export function createSessionToken(secret, now = Date.now()) {
  const expiresAt = now + SESSION_DURATION_MS;
  return `${expiresAt}.${signature(expiresAt, secret)}`;
}

export function verifySessionToken(token, secret, now = Date.now()) {
  if (!token || !secret) return false;
  const [expiresText, suppliedText] = String(token).split(".");
  const expiresAt = Number(expiresText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || !suppliedText)
    return false;
  const expected = Buffer.from(signature(expiresAt, secret));
  const supplied = Buffer.from(suppliedText);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export function setSessionCookie(res, secret) {
  res.cookie(COOKIE_NAME, createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION_MS,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}
