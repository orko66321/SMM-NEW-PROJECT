import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createUser, resetDb } from "./helpers.js";
import { env } from "../src/env.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

describe("reseller API key (Phase 4)", () => {
  it("generates a key once, and it authenticates the same as a JWT via X-API-Key", async () => {
    const user = await createUser();
    const gen = await request(app).post("/api/users/me/api-key").set("Authorization", `Bearer ${tokenFor(user.id)}`);
    expect(gen.status).toBe(201);
    expect(gen.body.apiKey).toMatch(/^smm_[a-f0-9]{64}$/);

    const viaKey = await request(app).get("/api/wallet").set("X-API-Key", gen.body.apiKey);
    expect(viaKey.status).toBe(200);
  });

  it("rejects an invalid or made-up API key", async () => {
    const res = await request(app).get("/api/wallet").set("X-API-Key", "smm_not-a-real-key");
    expect(res.status).toBe(401);
  });

  it("regenerating invalidates the previous key", async () => {
    const user = await createUser();
    const first = await request(app).post("/api/users/me/api-key").set("Authorization", `Bearer ${tokenFor(user.id)}`);
    const second = await request(app).post("/api/users/me/api-key").set("Authorization", `Bearer ${tokenFor(user.id)}`);
    expect(first.body.apiKey).not.toBe(second.body.apiKey);

    const staleKeyRes = await request(app).get("/api/wallet").set("X-API-Key", first.body.apiKey);
    expect(staleKeyRes.status).toBe(401);

    const freshKeyRes = await request(app).get("/api/wallet").set("X-API-Key", second.body.apiKey);
    expect(freshKeyRes.status).toBe(200);
  });

  it("revoking a key makes it stop working immediately", async () => {
    const user = await createUser();
    const gen = await request(app).post("/api/users/me/api-key").set("Authorization", `Bearer ${tokenFor(user.id)}`);

    const revoke = await request(app).delete("/api/users/me/api-key").set("Authorization", `Bearer ${tokenFor(user.id)}`);
    expect(revoke.status).toBe(204);

    const res = await request(app).get("/api/wallet").set("X-API-Key", gen.body.apiKey);
    expect(res.status).toBe(401);
  });

  it("a suspended user's API key stops working, same as their JWT would", async () => {
    const user = await createUser();
    const gen = await request(app).post("/api/users/me/api-key").set("Authorization", `Bearer ${tokenFor(user.id)}`);

    const { prisma } = await import("../src/lib/prisma.js");
    await prisma.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });

    const res = await request(app).get("/api/wallet").set("X-API-Key", gen.body.apiKey);
    expect(res.status).toBe(403);
  });
});
