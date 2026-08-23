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

describe("admin RBAC boundary", () => {
  const adminRoutes: Array<[method: "get" | "post" | "patch" | "delete" | "put", path: string]> = [
    ["get", "/api/admin/stats"],
    ["get", "/api/admin/users"],
    ["get", "/api/admin/orders"],
    ["get", "/api/admin/services"],
    ["get", "/api/admin/deposits"],
    ["get", "/api/admin/tickets"],
    ["post", "/api/admin/services"],
    ["post", "/api/admin/services/categories"],
    ["patch", "/api/admin/users/does-not-matter"],
    ["post", "/api/admin/wallet/does-not-matter/adjust"],
    ["get", "/api/admin/providers"],
    ["post", "/api/admin/providers"],
    ["post", "/api/admin/providers/does-not-matter/sync"],
    ["get", "/api/admin/payment-gateways"],
    ["put", "/api/admin/payment-gateways/BKASH"],
  ];

  it.each(adminRoutes)("a plain USER gets 403 on %s %s — even with a well-formed body", async (method, path) => {
    const user = await createUser({ role: "USER" });
    const res = await request(app)
      [method](path)
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      // Attempt param tampering: claim admin-ness inside the body itself.
      .send({ role: "ADMIN", isAdmin: true, amount: 10, reason: "test" });
    expect(res.status).toBe(403);
  });

  it("an unauthenticated request gets 401, not 403, on admin routes", async () => {
    const res = await request(app).get("/api/admin/stats");
    expect(res.status).toBe(401);
  });

  it("a suspended ADMIN cannot use admin routes", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const { prisma } = await import("../src/lib/prisma.js");
    await prisma.user.update({ where: { id: admin.id }, data: { status: "SUSPENDED" } });

    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${tokenFor(admin.id)}`);
    expect(res.status).toBe(403);
  });

  it("an ADMIN can access admin routes", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${tokenFor(admin.id)}`);
    expect(res.status).toBe(200);
  });

  it("STAFF has no admin access yet (Phase 1: ADMIN-only, granular permissions are a later phase)", async () => {
    const staff = await createUser({ role: "STAFF" });
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${tokenFor(staff.id)}`);
    expect(res.status).toBe(403);
  });
});
