import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock calls are hoisted above imports by Vitest, which is what makes
// this ordering safe despite `env.js` being imported transitively by
// helpers.js below — every module in this test file's isolated registry
// (Vitest gives each test file a fresh one) sees the mocked env, so Google
// auth is "configured" for every test in this file without touching the
// real .env or any other test file (see googleAuthDisabled.test.ts for the
// unconfigured case, which relies on the real env instead).
const verifyIdToken = vi.fn();

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({ verifyIdToken })),
}));

vi.mock("../src/env.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/env.js")>();
  return {
    ...actual,
    env: {
      ...actual.env,
      GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
      googleAuthEnabled: true,
    },
  };
});

import request from "supertest";
import { app, createUser, resetDb } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(() => {
  verifyIdToken.mockReset();
});
beforeEach(resetDb);
afterEach(resetDb);

function mockGooglePayload(payload: Record<string, unknown>) {
  verifyIdToken.mockResolvedValue({ getPayload: () => payload });
}

describe("Google OAuth sign-in — configured", () => {
  it("registers a new user, initializes their wallet at $0, assigns USER, and issues a session", async () => {
    mockGooglePayload({
      sub: "google-uid-1",
      email: "newgoogleuser@example.com",
      email_verified: true,
      name: "New User",
      picture: "https://example.com/pic.jpg",
    });

    const res = await request(app).post("/api/auth/google").send({ idToken: "fake-id-token" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("newgoogleuser@example.com");
    expect(res.body.user.role).toBe("USER");
    expect(res.body.user.avatarUrl).toBe("https://example.com/pic.jpg");
    expect(res.body.accessToken).toBeTruthy();
    expect(res.headers["set-cookie"]).toBeTruthy();

    const dbUser = await prisma.user.findUniqueOrThrow({ where: { email: "newgoogleuser@example.com" } });
    expect(dbUser.googleId).toBe("google-uid-1");
    expect(dbUser.passwordHash).toBeNull();

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: dbUser.id } });
    expect(wallet.balance.toString()).toBe("0");
  });

  it("generates a usernameSchema-valid username from an email with dots/plus signs", async () => {
    mockGooglePayload({ sub: "google-uid-6", email: "weird.email+tag@example.com", email_verified: true });

    const res = await request(app).post("/api/auth/google").send({ idToken: "fake-id-token-6" });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toMatch(/^[a-zA-Z0-9_]{3,32}$/);
  });

  it("logs in an existing googleId user on repeat sign-in without creating a duplicate account", async () => {
    mockGooglePayload({
      sub: "google-uid-2",
      email: "repeat@example.com",
      email_verified: true,
      picture: "https://example.com/p2.jpg",
    });

    const first = await request(app).post("/api/auth/google").send({ idToken: "fake-id-token-1" });
    const second = await request(app).post("/api/auth/google").send({ idToken: "fake-id-token-2" });

    expect(second.status).toBe(200);
    expect(second.body.user.id).toBe(first.body.user.id);

    const count = await prisma.user.count({ where: { email: "repeat@example.com" } });
    expect(count).toBe(1);
  });

  it("links googleId onto an existing password-created account matched by email, preserving the password", async () => {
    const existing = await createUser({ balance: 0 });
    mockGooglePayload({ sub: "google-uid-3", email: existing.email, email_verified: true, picture: "https://example.com/p3.jpg" });

    const res = await request(app).post("/api/auth/google").send({ idToken: "fake-id-token-3" });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(existing.id);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: existing.id } });
    expect(updated.googleId).toBe("google-uid-3");
    expect(updated.passwordHash).toBe(existing.passwordHash); // untouched — still a valid password login too
  });

  it("rejects an unverified Google email", async () => {
    mockGooglePayload({ sub: "google-uid-4", email: "unverified@example.com", email_verified: false });

    const res = await request(app).post("/api/auth/google").send({ idToken: "fake-id-token-4" });

    expect(res.status).toBe(401);
    const count = await prisma.user.count({ where: { email: "unverified@example.com" } });
    expect(count).toBe(0); // never created
  });

  it("rejects when Google's own verification throws (invalid/expired/tampered token)", async () => {
    verifyIdToken.mockRejectedValue(new Error("Token used too late"));

    const res = await request(app).post("/api/auth/google").send({ idToken: "invalid-or-expired-token-value" });

    expect(res.status).toBe(401);
  });

  it("rejects a suspended account even with an otherwise-valid Google credential", async () => {
    const suspended = await createUser({});
    await prisma.user.update({ where: { id: suspended.id }, data: { status: "SUSPENDED" } });
    mockGooglePayload({ sub: "google-uid-5", email: suspended.email, email_verified: true });

    const res = await request(app).post("/api/auth/google").send({ idToken: "fake-id-token-5" });

    expect(res.status).toBe(403);
  });
});
