import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createCategoryAndService, createUser, resetDb } from "./helpers.js";
import { env } from "../src/env.js";
import { createOrder } from "../src/services/order.service.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

async function anOrder(balance = 100) {
  const buyer = await createUser({ balance });
  const { service } = await createCategoryAndService({ sellPricePer1000: 10 });
  const order = await createOrder(buyer.id, { serviceId: service.id, link: "https://x.com/y", quantity: 1000 }, `k-${Math.random()}`);
  return { buyer, order };
}

describe("Comment templates CRUD", () => {
  it("ADMIN can create/list/update/delete; USER and MODERATOR cannot", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const mod = await createUser({ role: "MODERATOR" });
    const user = await createUser();

    const created = await request(app)
      .post("/api/admin/comment-templates")
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`)
      .send({ text: "Your UID is wrong. Please reorder.", link: "https://wa.me/8801000000000" });
    expect(created.status).toBe(201);
    const id = created.body.template.id;

    const list = await request(app).get("/api/admin/comment-templates").set("Authorization", `Bearer ${tokenFor(admin.id)}`);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].text).toContain("UID is wrong");

    const updated = await request(app)
      .put(`/api/admin/comment-templates/${id}`)
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`)
      .send({ text: "Updated text", link: "" });
    expect(updated.status).toBe(200);
    expect(updated.body.template.text).toBe("Updated text");
    expect(updated.body.template.link).toBeNull();

    // MODERATOR / USER blocked from the templates resource (adminOnly).
    expect((await request(app).get("/api/admin/comment-templates").set("Authorization", `Bearer ${tokenFor(mod.id)}`)).status).toBe(403);
    expect((await request(app).post("/api/admin/comment-templates").set("Authorization", `Bearer ${tokenFor(user.id)}`).send({ text: "x" })).status).toBe(403);

    const del = await request(app).delete(`/api/admin/comment-templates/${id}`).set("Authorization", `Bearer ${tokenFor(admin.id)}`);
    expect(del.status).toBe(204);
    const after = await request(app).get("/api/admin/comment-templates").set("Authorization", `Bearer ${tokenFor(admin.id)}`);
    expect(after.body.items).toHaveLength(0);
  });

  it("rejects an empty comment and a non-URL link", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const t = tokenFor(admin.id);
    expect((await request(app).post("/api/admin/comment-templates").set("Authorization", `Bearer ${t}`).send({ text: "  " })).status).toBe(400);
    expect((await request(app).post("/api/admin/comment-templates").set("Authorization", `Bearer ${t}`).send({ text: "ok", link: "not a url" })).status).toBe(400);
  });
});

describe("Per-order comment", () => {
  it("POST /admin/orders/:id/comment sets the note (+ timestamp) and touches nothing else; MODERATOR allowed", async () => {
    const mod = await createUser({ role: "MODERATOR" });
    const { order } = await anOrder();

    const res = await request(app)
      .post(`/api/admin/orders/${order.id}/comment`)
      .set("Authorization", `Bearer ${tokenFor(mod.id)}`)
      .send({ comment: "Cancelled & refunded — wrong UID.", commentLink: "https://wa.me/8801000000000" });

    expect(res.status).toBe(200);
    const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(row.adminComment).toBe("Cancelled & refunded — wrong UID.");
    expect(row.adminCommentLink).toBe("https://wa.me/8801000000000");
    expect(row.adminCommentUpdatedAt).toBeInstanceOf(Date);
    // untouched
    expect(row.status).toBe("PENDING");
    expect(row.charge.toString()).toBe("10");
  });

  it("an empty comment clears the note", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const { order } = await anOrder();
    await request(app).post(`/api/admin/orders/${order.id}/comment`).set("Authorization", `Bearer ${tokenFor(admin.id)}`).send({ comment: "note" });
    await request(app).post(`/api/admin/orders/${order.id}/comment`).set("Authorization", `Bearer ${tokenFor(admin.id)}`).send({ comment: "" });
    const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(row.adminComment).toBeNull();
  });

  it("a status change can carry the note in the same request", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const { order } = await anOrder();

    const res = await request(app)
      .patch(`/api/admin/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`)
      .send({ status: "CANCELED", comment: "আপনার UID ভুল।", commentLink: "https://wa.me/8801000000000" });

    expect(res.status).toBe(200);
    const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(row.status).toBe("CANCELED");
    expect(row.adminComment).toBe("আপনার UID ভুল।");
  });

  it("the customer sees adminComment / adminCommentLink but never apiErrorResponse", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const { buyer, order } = await anOrder();
    await prisma.order.update({ where: { id: order.id }, data: { apiErrorResponse: "secret provider detail" } });
    await request(app)
      .post(`/api/admin/orders/${order.id}/comment`)
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`)
      .send({ comment: "Delivery delayed — sorry!", commentLink: "https://wa.me/8801000000000" });

    const res = await request(app).get("/api/orders").set("Authorization", `Bearer ${tokenFor(buyer.id)}`);
    const o = res.body.items.find((x: { id: string }) => x.id === order.id);
    expect(o.adminComment).toBe("Delivery delayed — sorry!");
    expect(o.adminCommentLink).toBe("https://wa.me/8801000000000");
    expect(o).not.toHaveProperty("apiErrorResponse");
  });
});
