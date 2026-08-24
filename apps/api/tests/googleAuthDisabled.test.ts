import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Deliberately forces the unconfigured state via a per-file env mock rather
// than relying on the real .env happening to have GOOGLE_CLIENT_ID/SECRET
// unset — that's what this file originally did, and it broke the moment a
// real admin (correctly) configured Google OAuth in this repo's .env for
// production use. Mocking here makes the "graceful fallback" guarantee
// deterministic regardless of whatever the ambient environment happens to
// have configured, matching the mocking pattern in googleAuth.test.ts.
vi.mock("../src/env.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/env.js")>();
  return {
    ...actual,
    env: { ...actual.env, GOOGLE_CLIENT_ID: undefined, GOOGLE_CLIENT_SECRET: undefined, googleAuthEnabled: false },
  };
});

import request from "supertest";
import { app, resetDb } from "./helpers.js";

beforeEach(resetDb);
afterEach(resetDb);

describe("Google OAuth — gracefully disabled when unconfigured", () => {
  it("POST /api/auth/google returns a clear 400 instead of crashing", async () => {
    const res = await request(app).post("/api/auth/google").send({ idToken: "irrelevant-since-unconfigured" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not configured/i);
  });

  it("/api/public/settings reports googleAuthEnabled: false so the frontend can hide the button", async () => {
    const res = await request(app).get("/api/public/settings");

    expect(res.status).toBe(200);
    expect(res.body.googleAuthEnabled).toBe(false);
  });
});
