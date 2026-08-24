import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, resetDb } from "./helpers.js";

// Deliberately does NOT mock env.js or google-auth-library — this exercises
// the real, unmodified env (GOOGLE_CLIENT_ID/SECRET are unset in this
// repo's .env by default) to prove the "graceful fallback" requirement:
// the app never crashes or throws an unhandled error when Google OAuth
// isn't configured, it just returns a clear, ordinary 400.
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
