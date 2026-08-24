import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createCategoryAndService, createProvider, createUser, resetDb } from "./helpers.js";
import { startMockProvider } from "./mocks/japProvider.js";
import { env } from "../src/env.js";
import { prisma } from "../src/lib/prisma.js";
import { pollRefillStatus } from "../src/cron/pollRefillStatus.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

async function completedOrder(opts: { userId: string; serviceId: string; mode?: "AUTO" | "MANUAL"; providerOrderId?: string }) {
  return prisma.order.create({
    data: {
      userId: opts.userId,
      serviceId: opts.serviceId,
      link: "https://instagram.com/someone",
      quantity: 1000,
      charge: 10,
      providerCost: 5,
      status: "COMPLETED",
      mode: opts.mode ?? "MANUAL",
      providerOrderId: opts.providerOrderId,
    },
  });
}

describe("refill requests", () => {
  it("rejects a refill on a service that isn't refill-eligible", async () => {
    const user = await createUser({ balance: 100 });
    const { service } = await createCategoryAndService({ refillEnabled: false });
    const order = await completedOrder({ userId: user.id, serviceId: service.id });

    const res = await request(app)
      .post(`/api/orders/${order.id}/refill`)
      .set("Authorization", `Bearer ${tokenFor(user.id)}`);
    expect(res.status).toBe(400);
  });

  it("rejects a refill on an order that isn't COMPLETED/PARTIAL", async () => {
    const user = await createUser({ balance: 100 });
    const { service } = await createCategoryAndService({ refillEnabled: true });
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        link: "https://instagram.com/someone",
        quantity: 1000,
        charge: 10,
        providerCost: 5,
        status: "PROCESSING",
      },
    });

    const res = await request(app)
      .post(`/api/orders/${order.id}/refill`)
      .set("Authorization", `Bearer ${tokenFor(user.id)}`);
    expect(res.status).toBe(400);
  });

  it("rejects a refill for an order that belongs to a different user", async () => {
    const owner = await createUser({ balance: 100 });
    const stranger = await createUser({ balance: 100 });
    const { service } = await createCategoryAndService({ refillEnabled: true });
    const order = await completedOrder({ userId: owner.id, serviceId: service.id });

    const res = await request(app)
      .post(`/api/orders/${order.id}/refill`)
      .set("Authorization", `Bearer ${tokenFor(stranger.id)}`);
    expect(res.status).toBe(404);
  });

  it("a MANUAL-mode order drops into the admin-resolved queue (REQUESTED, no provider call)", async () => {
    const user = await createUser({ balance: 100 });
    const { service } = await createCategoryAndService({ refillEnabled: true });
    const order = await completedOrder({ userId: user.id, serviceId: service.id, mode: "MANUAL" });

    const res = await request(app)
      .post(`/api/orders/${order.id}/refill`)
      .set("Authorization", `Bearer ${tokenFor(user.id)}`);
    expect(res.status).toBe(201);
    expect(res.body.refill.status).toBe("REQUESTED");
    expect(res.body.refill.providerRefillId).toBeNull();
  });

  it("an AUTO order with a providerOrderId submits action=refill to the provider immediately", async () => {
    const mock = await startMockProvider({ refill: () => ({ refill: "refill-123" }) });
    try {
      const user = await createUser({ balance: 100 });
      const provider = await createProvider({ apiUrl: mock.url });
      const { service } = await createCategoryAndService({ refillEnabled: true, providerId: provider.id });
      const order = await completedOrder({
        userId: user.id,
        serviceId: service.id,
        mode: "AUTO",
        providerOrderId: "provider-order-1",
      });

      const res = await request(app)
        .post(`/api/orders/${order.id}/refill`)
        .set("Authorization", `Bearer ${tokenFor(user.id)}`);
      expect(res.status).toBe(201);
      expect(res.body.refill.status).toBe("IN_PROGRESS");
      expect(res.body.refill.providerRefillId).toBe("refill-123");
    } finally {
      await mock.close();
    }
  });

  it("rejects a second refill while one is already in progress for the same order", async () => {
    const user = await createUser({ balance: 100 });
    const { service } = await createCategoryAndService({ refillEnabled: true });
    const order = await completedOrder({ userId: user.id, serviceId: service.id });

    const first = await request(app)
      .post(`/api/orders/${order.id}/refill`)
      .set("Authorization", `Bearer ${tokenFor(user.id)}`);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/orders/${order.id}/refill`)
      .set("Authorization", `Bearer ${tokenFor(user.id)}`);
    expect(second.status).toBe(409);
  });

  it("cron/pollRefillStatus reconciles an IN_PROGRESS provider refill to COMPLETED", async () => {
    const mock = await startMockProvider({ refill_status: () => ({ status: "Completed" }) });
    try {
      const user = await createUser({ balance: 100 });
      const provider = await createProvider({ apiUrl: mock.url });
      const { service } = await createCategoryAndService({ refillEnabled: true, providerId: provider.id });
      const order = await completedOrder({
        userId: user.id,
        serviceId: service.id,
        mode: "AUTO",
        providerOrderId: "provider-order-2",
      });
      const refill = await prisma.refillRequest.create({
        data: { orderId: order.id, providerRefillId: "refill-456", status: "IN_PROGRESS" },
      });

      const result = await pollRefillStatus();
      expect(result.updated).toBe(1);

      const updated = await prisma.refillRequest.findUniqueOrThrow({ where: { id: refill.id } });
      expect(updated.status).toBe("COMPLETED");
    } finally {
      await mock.close();
    }
  });

  it("an admin can resolve a manual (REQUESTED) refill", async () => {
    const user = await createUser({ balance: 100 });
    const admin = await createUser({ role: "ADMIN" });
    const { service } = await createCategoryAndService({ refillEnabled: true });
    const order = await completedOrder({ userId: user.id, serviceId: service.id });
    const refill = await prisma.refillRequest.create({ data: { orderId: order.id, status: "REQUESTED" } });

    const res = await request(app)
      .patch(`/api/admin/orders/refills/${refill.id}`)
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`)
      .send({ status: "COMPLETED", note: "Reset via provider dashboard" });
    expect(res.status).toBe(200);
    expect(res.body.refill.status).toBe("COMPLETED");
  });

  it("resolving an already-resolved refill is rejected with 409", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const user = await createUser({ balance: 100 });
    const { service } = await createCategoryAndService({ refillEnabled: true });
    const order = await completedOrder({ userId: user.id, serviceId: service.id });
    const refill = await prisma.refillRequest.create({ data: { orderId: order.id, status: "COMPLETED" } });

    const res = await request(app)
      .patch(`/api/admin/orders/refills/${refill.id}`)
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`)
      .send({ status: "REJECTED" });
    expect(res.status).toBe(409);
  });
});
