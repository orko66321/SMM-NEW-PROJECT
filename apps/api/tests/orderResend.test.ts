import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createCategoryAndService, createProvider, createUser, resetDb } from "./helpers.js";
import { env } from "../src/env.js";
import { startMockProvider } from "./mocks/japProvider.js";
import { submitPendingOrders } from "../src/cron/submitPendingOrders.js";
import { createOrder } from "../src/services/order.service.js";
import { getWalletForUser } from "../src/services/wallet.service.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

async function setResendToggle(enabled: boolean) {
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: { resendOrderButtonEnabled: enabled },
    create: { id: "default", resendOrderButtonEnabled: enabled },
  });
}

describe("Order apiErrorResponse capture + access control", () => {
  it("provider submission failure saves the raw error; admin sees it, the customer never does", async () => {
    const mock = await startMockProvider({ add: () => ({ error: "Insufficient balance" }) });
    try {
      const admin = await createUser({ role: "ADMIN" });
      const user = await createUser({ balance: 100 });
      const provider = await createProvider({ apiUrl: mock.url });
      const { service } = await createCategoryAndService({ autoSubmit: true, providerId: provider.id, sellPricePer1000: 10 });
      const order = await createOrder(user.id, { serviceId: service.id, link: "https://x.com/y", quantity: 1000 }, "err-key-1");

      await submitPendingOrders();

      const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(row.status).toBe("FAILED");
      expect(row.apiErrorResponse).toContain("Insufficient balance");

      // Admin list — error present.
      const adminRes = await request(app).get("/api/admin/orders").set("Authorization", `Bearer ${tokenFor(admin.id)}`);
      const adminOrder = adminRes.body.items.find((o: { id: string }) => o.id === order.id);
      expect(adminOrder.apiErrorResponse).toContain("Insufficient balance");

      // Customer list — field must not be there at all.
      const userRes = await request(app).get("/api/orders").set("Authorization", `Bearer ${tokenFor(user.id)}`);
      const userOrder = userRes.body.items.find((o: { id: string }) => o.id === order.id);
      expect(userOrder.status).toBe("FAILED");
      expect(userOrder).not.toHaveProperty("apiErrorResponse");
    } finally {
      await mock.close();
    }
  });
});

describe("Admin resend order", () => {
  it("resends a FAILED (already-refunded) order: re-charges the wallet, submits, goes PROCESSING, clears the error", async () => {
    const failing = await startMockProvider({ add: () => ({ error: "Out of stock" }) });
    const working = await startMockProvider({ add: () => ({ order: "resent-123" }) });
    try {
      const admin = await createUser({ role: "ADMIN" });
      const user = await createUser({ balance: 100 });
      const provider = await createProvider({ apiUrl: failing.url });
      const { service } = await createCategoryAndService({ autoSubmit: true, providerId: provider.id, sellPricePer1000: 10 });
      const order = await createOrder(user.id, { serviceId: service.id, link: "https://x.com/y", quantity: 1000 }, "resend-key-1");

      await submitPendingOrders(); // -> FAILED + refunded, balance back to 100
      expect((await getWalletForUser(user.id)).balance.toString()).toBe("100");

      // Point the service's provider at a working endpoint, then resend.
      await prisma.provider.update({ where: { id: provider.id }, data: { apiUrl: working.url } });
      const res = await request(app)
        .post(`/api/admin/orders/${order.id}/resend`)
        .set("Authorization", `Bearer ${tokenFor(admin.id)}`);

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe("PROCESSING");
      expect(res.body.order.providerOrderId).toBe("resent-123");

      const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(row.apiErrorResponse).toBeNull();
      // 100 (refunded) - 10 (re-charge) = 90
      expect((await getWalletForUser(user.id)).balance.toString()).toBe("90");
    } finally {
      await failing.close();
      await working.close();
    }
  });

  it("resends a PENDING order without touching the wallet", async () => {
    const working = await startMockProvider({ add: () => ({ order: "pending-resent-1" }) });
    try {
      const admin = await createUser({ role: "ADMIN" });
      const user = await createUser({ balance: 100 });
      const provider = await createProvider({ apiUrl: working.url });
      // autoSubmit false -> stays PENDING, never auto-picked-up
      const { service } = await createCategoryAndService({ providerId: provider.id, sellPricePer1000: 10 });
      const order = await createOrder(user.id, { serviceId: service.id, link: "https://x.com/y", quantity: 1000 }, "pending-key-1");
      expect((await getWalletForUser(user.id)).balance.toString()).toBe("90");

      const res = await request(app)
        .post(`/api/admin/orders/${order.id}/resend`)
        .set("Authorization", `Bearer ${tokenFor(admin.id)}`);

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe("PROCESSING");
      expect((await getWalletForUser(user.id)).balance.toString()).toBe("90"); // unchanged
    } finally {
      await working.close();
    }
  });

  it("on provider failure: keeps the order pending, records the new error, returns 502", async () => {
    const failing = await startMockProvider({ add: () => ({ error: "Unauthorized" }) });
    try {
      const admin = await createUser({ role: "ADMIN" });
      const user = await createUser({ balance: 100 });
      const provider = await createProvider({ apiUrl: failing.url });
      const { service } = await createCategoryAndService({ providerId: provider.id, sellPricePer1000: 10 });
      const order = await createOrder(user.id, { serviceId: service.id, link: "https://x.com/y", quantity: 1000 }, "resend-fail-1");

      const res = await request(app)
        .post(`/api/admin/orders/${order.id}/resend`)
        .set("Authorization", `Bearer ${tokenFor(admin.id)}`);

      expect(res.status).toBe(502);
      const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(row.status).toBe("PENDING");
      expect(row.apiErrorResponse).toContain("Unauthorized");
      expect(row.providerOrderId).toBeNull();
    } finally {
      await failing.close();
    }
  });

  it("rejects resend when the customer can no longer cover a re-charge for a FAILED order", async () => {
    const failing = await startMockProvider({ add: () => ({ error: "down" }) });
    const working = await startMockProvider({ add: () => ({ order: "should-not-happen" }) });
    try {
      const admin = await createUser({ role: "ADMIN" });
      const user = await createUser({ balance: 10 });
      const provider = await createProvider({ apiUrl: failing.url });
      const { service } = await createCategoryAndService({ autoSubmit: true, providerId: provider.id, sellPricePer1000: 10 });
      const order = await createOrder(user.id, { serviceId: service.id, link: "https://x.com/y", quantity: 1000 }, "broke-key-1");

      await submitPendingOrders(); // FAILED + refund -> balance 10
      // Simulate the customer spending the refund elsewhere.
      await prisma.wallet.update({ where: { userId: user.id }, data: { balance: 0 } });
      await prisma.provider.update({ where: { id: provider.id }, data: { apiUrl: working.url } });

      const res = await request(app)
        .post(`/api/admin/orders/${order.id}/resend`)
        .set("Authorization", `Bearer ${tokenFor(admin.id)}`);

      expect(res.status).toBe(400);
      const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(row.status).toBe("FAILED"); // untouched
      expect((await getWalletForUser(user.id)).balance.toString()).toBe("0");
    } finally {
      await failing.close();
      await working.close();
    }
  });

  it("rejects a manual order with no provider configured", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const user = await createUser({ balance: 100 });
    const { service } = await createCategoryAndService({ sellPricePer1000: 10 }); // no provider
    const order = await createOrder(user.id, { serviceId: service.id, link: "https://x.com/y", quantity: 1000 }, "manual-key-1");

    const res = await request(app)
      .post(`/api/admin/orders/${order.id}/resend`)
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`);
    expect(res.status).toBe(400);
  });

  it("rejects an order that was already submitted to a provider", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const user = await createUser({ balance: 100 });
    const provider = await createProvider();
    const { service } = await createCategoryAndService({ providerId: provider.id, sellPricePer1000: 10 });
    const order = await createOrder(user.id, { serviceId: service.id, link: "https://x.com/y", quantity: 1000 }, "already-key-1");
    await prisma.order.update({ where: { id: order.id }, data: { status: "PENDING", providerOrderId: "existing-ref" } });

    const res = await request(app)
      .post(`/api/admin/orders/${order.id}/resend`)
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`);
    expect(res.status).toBe(409);
  });

  it("is rejected with 403 when the Settings kill-switch is off", async () => {
    const working = await startMockProvider({ add: () => ({ order: "nope" }) });
    try {
      await setResendToggle(false);
      const admin = await createUser({ role: "ADMIN" });
      const user = await createUser({ balance: 100 });
      const provider = await createProvider({ apiUrl: working.url });
      const { service } = await createCategoryAndService({ providerId: provider.id, sellPricePer1000: 10 });
      const order = await createOrder(user.id, { serviceId: service.id, link: "https://x.com/y", quantity: 1000 }, "toggle-key-1");

      const res = await request(app)
        .post(`/api/admin/orders/${order.id}/resend`)
        .set("Authorization", `Bearer ${tokenFor(admin.id)}`);
      expect(res.status).toBe(403);
    } finally {
      await working.close();
    }
  });
});
