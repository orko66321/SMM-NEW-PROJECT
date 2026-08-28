import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createUser, resetDb } from "./helpers.js";
import { createBanner, deleteBanner, listBannersForAdmin, updateBanner } from "../src/services/banner.service.js";
import { env } from "../src/env.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

describe("banner slider", () => {
  it("/api/public/banners sorts ascending by order, including negative values", async () => {
    await createBanner({ link: "/a", image: TINY_PNG, order: 5 });
    await createBanner({ link: "/b", image: TINY_PNG, order: -13 });
    await createBanner({ link: "/c", image: TINY_PNG, order: 0 });
    await createBanner({ link: "/d", image: TINY_PNG, order: -1 });

    const res = await request(app).get("/api/public/banners");
    expect(res.status).toBe(200);
    expect(res.body.items.map((b: { link: string }) => b.link)).toEqual(["/b", "/d", "/c", "/a"]);
  });

  it("/api/public/banners requires no auth and returns an empty list rather than erroring when there are none", async () => {
    const res = await request(app).get("/api/public/banners");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it("admin create/update/delete round-trip through the real HTTP routes", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = tokenFor(admin.id);

    const createRes = await request(app)
      .post("/api/admin/banners")
      .set("Authorization", `Bearer ${token}`)
      .send({ link: "https://example.com/promo", image: TINY_PNG, order: -10 });
    expect(createRes.status).toBe(201);
    const id = createRes.body.banner.id;

    const updateRes = await request(app)
      .put(`/api/admin/banners/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ order: 2 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.banner.order).toBe(2);
    // PUT was partial (order only) — link must survive untouched.
    expect(updateRes.body.banner.link).toBe("https://example.com/promo");

    const deleteRes = await request(app).delete(`/api/admin/banners/${id}`).set("Authorization", `Bearer ${token}`);
    expect(deleteRes.status).toBe(204);

    const listed = await listBannersForAdmin(1, 20);
    expect(listed.items).toHaveLength(0);
  });

  it("admin list is paginated", async () => {
    for (let i = 0; i < 15; i++) {
      await createBanner({ link: `/banner-${i}`, image: TINY_PNG, order: i });
    }
    const page1 = await listBannersForAdmin(1, 10);
    expect(page1.items).toHaveLength(10);
    expect(page1.total).toBe(15);
    const page2 = await listBannersForAdmin(2, 10);
    expect(page2.items).toHaveLength(5);
  });

  it("updating or deleting a banner that doesn't exist throws a clear not-found error, not a raw Prisma error", async () => {
    await expect(updateBanner("does-not-exist", { order: 1 })).rejects.toThrow(/not found/i);
    await expect(deleteBanner("does-not-exist")).rejects.toThrow(/not found/i);
  });
});
