import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createBrand, createProduct, createStockPoolWithCodes, createUser, resetDb } from "./helpers.js";
import { env } from "../src/env.js";

// Regression coverage for a real bug: the admin Packages form fetches the
// whole product / stock-pool list in a single page to fill its <select>
// controls (`getAdminProducts({ page: 1, pageSize: 200 })` and friends), and
// the admin Products form does the same for services. paginationQuerySchema
// capped pageSize at 100, so every one of those requests 400'd and the
// dropdowns rendered empty. The cap is now 200 — high enough for those
// "load all options" calls, still bounded.
beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

describe("admin list endpoints accept the pageSize=200 the dropdown loaders send", () => {
  it("products: page=1&pageSize=200 returns 200 with the product list", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const brand = await createBrand();
    await createProduct(brand.id, { name: "Product A" });
    await createProduct(brand.id, { name: "Product B" });

    const res = await request(app)
      .get("/api/admin/products")
      .query({ page: 1, pageSize: 200 })
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
  });

  it("stock-pools: page=1&pageSize=200 returns 200 with the pool list", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await createStockPoolWithCodes(["CODE-1"], "Pool A");

    const res = await request(app)
      .get("/api/admin/stock-pools")
      .query({ page: 1, pageSize: 200 })
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it("services: page=1&pageSize=200 returns 200", async () => {
    const admin = await createUser({ role: "ADMIN" });

    const res = await request(app)
      .get("/api/admin/services")
      .query({ page: 1, pageSize: 200 })
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("still rejects an unbounded page (pageSize=1000)", async () => {
    const admin = await createUser({ role: "ADMIN" });

    const res = await request(app)
      .get("/api/admin/products")
      .query({ page: 1, pageSize: 1000 })
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`);

    expect(res.status).toBe(400);
  });
});
