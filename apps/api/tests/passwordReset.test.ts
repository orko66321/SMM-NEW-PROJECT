import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import argon2 from "argon2";
import { app, createUser, resetDb } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

async function requestReset(identifier: string) {
  return request(app).post("/api/auth/forgot-password").send({ identifier });
}

async function issueTokenFor(userId: string) {
  // Mirrors requestPasswordReset's own token generation so the test can get
  // the plaintext token without depending on an SMTP mailbox — see
  // passwordReset.service.ts (SMTP unconfigured logs instead of sending).
  const crypto = await import("node:crypto");
  const tokenValue = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(tokenValue).digest("hex");
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
  });
  return tokenValue;
}

describe("password reset (Phase 4)", () => {
  it("always returns 204 whether or not the account exists — no account enumeration", async () => {
    const user = await createUser();
    const existing = await requestReset(user.username);
    expect(existing.status).toBe(204);

    const nonExistent = await requestReset("no-such-user-at-all");
    expect(nonExistent.status).toBe(204);
  });

  it("creates a usable, single-use reset token for a real account", async () => {
    const user = await createUser();
    await requestReset(user.email);

    const record = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(record.usedAt).toBeNull();
    expect(record.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("resets the password, revokes existing sessions, and rejects reusing the same token", async () => {
    const user = await createUser();
    const token = await issueTokenFor(user.id);

    // Give the user an active refresh session to prove it gets revoked.
    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: "irrelevant-hash-for-test", expiresAt: new Date(Date.now() + 1000 * 60 * 60) },
    });

    const first = await request(app).post("/api/auth/reset-password").send({ token, password: "NewPassword123" });
    expect(first.status).toBe(204);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await argon2.verify(updated.passwordHash, "NewPassword123")).toBe(true);

    const sessions = await prisma.refreshToken.findMany({ where: { userId: user.id } });
    expect(sessions.every((s) => s.revokedAt !== null)).toBe(true);

    const second = await request(app).post("/api/auth/reset-password").send({ token, password: "AnotherPassword456" });
    expect(second.status).toBe(400);
  });

  it("rejects an expired token", async () => {
    const user = await createUser();
    const crypto = await import("node:crypto");
    const tokenValue = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(tokenValue).digest("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app).post("/api/auth/reset-password").send({ token: tokenValue, password: "NewPassword123" });
    expect(res.status).toBe(400);
  });

  it("rejects an unknown token", async () => {
    const res = await request(app).post("/api/auth/reset-password").send({ token: "not-a-real-token-value", password: "NewPassword123" });
    expect(res.status).toBe(400);
  });
});
