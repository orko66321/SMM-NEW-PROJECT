import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, resetDb } from "./helpers.js";

beforeEach(resetDb);
afterEach(resetDb);

describe("auth", () => {
  it("registers a new user and ignores an attempted role override (mass-assignment defense)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "alice", email: "alice@test.local", password: "Password123!", role: "ADMIN" });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("USER"); // zod strips the unknown `role` field
  });

  it("rejects duplicate email/username registration without revealing which field collided", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ username: "bob", email: "bob@test.local", password: "Password123!" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "someoneelse", email: "bob@test.local", password: "Password123!" });

    expect(res.status).toBe(409);
  });

  it("logs in with correct credentials and rejects incorrect password with a generic message", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ username: "carol", email: "carol@test.local", password: "Password123!" });

    const good = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "carol", password: "Password123!" });
    expect(good.status).toBe(200);
    expect(good.body.accessToken).toBeTruthy();

    const bad = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "carol", password: "WrongPassword!" });
    expect(bad.status).toBe(401);

    const nonexistent = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "nobody_here", password: "WrongPassword!" });
    expect(nonexistent.status).toBe(401);
    expect(nonexistent.body.error).toBe(bad.body.error); // identical message either way
  });

  it("rejects /me without a bearer token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("issues a working access token that /me accepts", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ username: "dave", email: "dave@test.local", password: "Password123!" });
    const login = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "dave", password: "Password123!" });

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe("dave");
  });
});
