import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, createCategoryAndService, createUser, resetDb } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";
import { recomputeServiceCompletionStats } from "../src/services/catalog.service.js";
import { updateOrderStatus } from "../src/services/order.service.js";

beforeEach(resetDb);
afterEach(resetDb);

async function makeOrder(
  serviceId: string,
  userId: string,
  opts: {
    status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "PARTIAL";
    createdAt?: Date;
    completedAt?: Date | null;
    completionSeconds?: number | null;
    quantity?: number;
  } = {},
) {
  return prisma.order.create({
    data: {
      userId,
      serviceId,
      link: "https://instagram.com/someone",
      quantity: opts.quantity ?? 1000,
      charge: 10,
      providerCost: 5,
      status: opts.status ?? "PENDING",
      createdAt: opts.createdAt ?? new Date(),
      completedAt: opts.completedAt ?? null,
      completionSeconds: opts.completionSeconds ?? null,
    },
  });
}

describe("service completion-time stats", () => {
  it("stamps completion + rolls up the service average when an order first completes", async () => {
    const user = await createUser();
    const { service } = await createCategoryAndService();
    const order = await makeOrder(service.id, user.id, {
      status: "IN_PROGRESS",
      createdAt: new Date(Date.now() - 300_000), // 5 min ago
    });

    await updateOrderStatus(order.id, { status: "COMPLETED" });

    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updatedOrder.completedAt).not.toBeNull();
    expect(updatedOrder.completionSeconds).toBeGreaterThanOrEqual(295);
    expect(updatedOrder.completionSeconds).toBeLessThanOrEqual(320);

    const updatedService = await prisma.service.findUniqueOrThrow({ where: { id: service.id } });
    expect(updatedService.avgCompletionSeconds).toBe(updatedOrder.completionSeconds);
    expect(updatedService.lastCompletedAt?.getTime()).toBe(updatedOrder.completedAt?.getTime());
  });

  it("does not move completedAt when an already-completed order is re-set to COMPLETED", async () => {
    const user = await createUser();
    const { service } = await createCategoryAndService();
    const order = await makeOrder(service.id, user.id, {
      status: "IN_PROGRESS",
      createdAt: new Date(Date.now() - 60_000),
    });

    await updateOrderStatus(order.id, { status: "COMPLETED" });
    const first = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });

    await new Promise((r) => setTimeout(r, 20));
    await updateOrderStatus(order.id, { status: "COMPLETED", remains: 0 });
    const second = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });

    expect(second.completedAt?.getTime()).toBe(first.completedAt?.getTime());
    expect(second.completionSeconds).toBe(first.completionSeconds);
  });

  it("averages only the most recent N (avgCompletionSampleSize) and counts PARTIAL", async () => {
    const user = await createUser();
    const { service } = await createCategoryAndService();
    await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: { avgCompletionSampleSize: 2 },
      create: { id: "default", avgCompletionSampleSize: 2 },
    });

    const base = Date.now();
    // Oldest → newest. Only the newest two (200 PARTIAL, 400) should count.
    await makeOrder(service.id, user.id, {
      status: "COMPLETED",
      completionSeconds: 100,
      completedAt: new Date(base - 30_000),
    });
    await makeOrder(service.id, user.id, {
      status: "PARTIAL",
      completionSeconds: 200,
      completedAt: new Date(base - 20_000),
    });
    const newest = await makeOrder(service.id, user.id, {
      status: "COMPLETED",
      completionSeconds: 400,
      completedAt: new Date(base - 10_000),
    });

    await prisma.$transaction((tx) => recomputeServiceCompletionStats(tx, service.id));

    const updated = await prisma.service.findUniqueOrThrow({ where: { id: service.id } });
    expect(updated.avgCompletionSeconds).toBe(300); // (200 + 400) / 2
    expect(updated.lastCompletedAt?.getTime()).toBe(newest.completedAt?.getTime());
  });
});

describe("GET /api/public/services/:id/completed-orders", () => {
  it("returns anonymous paginated completed orders, newest first", async () => {
    const user = await createUser();
    const { service } = await createCategoryAndService();
    const base = Date.now();
    for (let i = 0; i < 3; i += 1) {
      await makeOrder(service.id, user.id, {
        status: "COMPLETED",
        completionSeconds: (i + 1) * 60,
        completedAt: new Date(base - (3 - i) * 10_000),
        quantity: (i + 1) * 100,
      });
    }

    const res = await request(app).get(`/api/public/services/${service.id}/completed-orders?page=1&pageSize=2`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items).toHaveLength(2);
    // Newest first — the last order created has the largest completedAt.
    expect(res.body.items[0].completionSeconds).toBe(180);
    expect(res.body.items[1].completionSeconds).toBe(120);
    // Public shape: no user/link/charge leakage.
    expect(res.body.items[0]).not.toHaveProperty("userId");
    expect(res.body.items[0]).not.toHaveProperty("link");
    expect(res.body.items[0]).not.toHaveProperty("charge");
  });

  it("200s with an empty page for a service that has no completed orders", async () => {
    const { service } = await createCategoryAndService();
    const res = await request(app).get(`/api/public/services/${service.id}/completed-orders`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.items).toEqual([]);
  });
});
