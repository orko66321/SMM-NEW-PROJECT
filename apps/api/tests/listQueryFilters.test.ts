import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createCategoryAndService, createUser, resetDb } from "./helpers.js";
import { env } from "../src/env.js";
import { prisma } from "../src/lib/prisma.js";
import { createTicket } from "../src/services/ticket.service.js";

// Regression coverage for a real, previously-untested bug: every one of
// these routes validates its query string with `validate(<schema>, "query")`
// using a schema that (before the fix) only declared page/pageSize — zod
// objects strip unrecognized keys by default, so status/search/categoryId
// were silently deleted from req.query before any route handler ever read
// them. Found while adding service search-by-product-code (see
// packages/shared's serviceListQuerySchema and friends); every filter box
// wired this way turned out to be non-functional the same way. Each test
// here proves the filter genuinely narrows results through the real HTTP
// route, not just that the route doesn't crash.
beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

describe("list query filters actually reach the route handlers", () => {
  it("services: search matches an exact provider product code, not just the name", async () => {
    const user = await createUser();
    const { service: matching } = await createCategoryAndService({ providerServiceId: "18801" });
    await createCategoryAndService({ providerServiceId: "99999" });

    const res = await request(app)
      .get("/api/services")
      .query({ search: "18801" })
      .set("Authorization", `Bearer ${tokenFor(user.id)}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe(matching.id);
  });

  it("services: categoryId filter narrows the public catalog", async () => {
    const { category: catA, service: serviceA } = await createCategoryAndService({});
    const { category: catB } = await createCategoryAndService({});
    expect(catA.id).not.toBe(catB.id);

    const res = await request(app).get("/api/public/services").query({ categoryId: catA.id });

    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { id: string }) => i.id)).toEqual([serviceA.id]);
  });

  it("orders (dashboard): status filter narrows a user's own order list", async () => {
    const user = await createUser();
    const { service } = await createCategoryAndService({});
    await prisma.order.createMany({
      data: [
        { userId: user.id, serviceId: service.id, link: "https://x.com/a", quantity: 100, charge: 1, providerCost: 0.5, status: "COMPLETED" },
        { userId: user.id, serviceId: service.id, link: "https://x.com/b", quantity: 100, charge: 1, providerCost: 0.5, status: "PENDING" },
      ],
    });

    const res = await request(app)
      .get("/api/orders")
      .query({ status: "COMPLETED" })
      .set("Authorization", `Bearer ${tokenFor(user.id)}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].status).toBe("COMPLETED");
  });

  it("orders (admin): status and search filters both narrow the list", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const buyer = await createUser();
    const { service } = await createCategoryAndService({});
    await prisma.order.createMany({
      data: [
        { userId: buyer.id, serviceId: service.id, link: "https://x.com/findme", quantity: 100, charge: 1, providerCost: 0.5, status: "FAILED" },
        { userId: buyer.id, serviceId: service.id, link: "https://x.com/other", quantity: 100, charge: 1, providerCost: 0.5, status: "COMPLETED" },
      ],
    });

    const byStatus = await request(app)
      .get("/api/admin/orders")
      .query({ status: "FAILED" })
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`);
    expect(byStatus.body.items).toHaveLength(1);
    expect(byStatus.body.items[0].status).toBe("FAILED");

    const bySearch = await request(app)
      .get("/api/admin/orders")
      .query({ search: "findme" })
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`);
    expect(bySearch.body.items).toHaveLength(1);
    expect(bySearch.body.items[0].link).toContain("findme");
  });

  it("deposits (admin): status filter narrows the queue", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const buyer = await createUser();
    await prisma.deposit.createMany({
      data: [
        { userId: buyer.id, method: "Test", amount: 10, status: "PENDING" },
        { userId: buyer.id, method: "Test", amount: 10, status: "APPROVED" },
      ],
    });

    const res = await request(app)
      .get("/api/admin/deposits")
      .query({ status: "PENDING" })
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].status).toBe("PENDING");
  });

  it("tickets (admin): status filter narrows the list", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const buyer = await createUser();
    const human = await prisma.ticketCategory.findFirstOrThrow({ where: { isAutomated: false } });
    await createTicket(buyer.id, { categoryId: human.id, message: "Open one — help" });
    const closedOne = await createTicket(buyer.id, { categoryId: human.id, message: "Closed one — help" });
    await prisma.ticket.update({ where: { id: closedOne.id }, data: { status: "CLOSED" } });

    const res = await request(app)
      .get("/api/admin/tickets")
      .query({ status: "CLOSED" })
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].subject).toContain("Closed one");
  });

  it("users (admin): search filter narrows the list by username/email", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const target = await createUser();
    await createUser();

    const res = await request(app)
      .get("/api/admin/users")
      .query({ search: target.username })
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe(target.id);
  });
});
