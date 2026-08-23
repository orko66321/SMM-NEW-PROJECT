import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCategoryAndService, createProvider, createUser, resetDb } from "./helpers.js";
import { startMockProvider } from "./mocks/japProvider.js";
import { submitPendingOrders } from "../src/cron/submitPendingOrders.js";
import { createOrder } from "../src/services/order.service.js";
import { getWalletForUser } from "../src/services/wallet.service.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

describe("auto-fulfillment (Phase 2 provider submission + failover)", () => {
  it("submits a PENDING order on an autoSubmit service to the primary provider", async () => {
    const mock = await startMockProvider({ add: () => ({ order: "primary-order-1" }) });
    try {
      const user = await createUser({ balance: 100 });
      const provider = await createProvider({ apiUrl: mock.url });
      const { service } = await createCategoryAndService({ autoSubmit: true, providerId: provider.id, sellPricePer1000: 10 });

      const order = await createOrder(user.id, { serviceId: service.id, link: "https://x.com/y", quantity: 1000 }, "auto-key-1");
      await submitPendingOrders();

      const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(updated.providerOrderId).toBe("primary-order-1");
      expect(updated.status).toBe("PROCESSING");
      expect(updated.mode).toBe("AUTO");
    } finally {
      await mock.close();
    }
  });

  it("falls back to the backup provider when the primary fails", async () => {
    const failingMock = await startMockProvider({ add: () => ({ error: "Provider out of balance" }) });
    const workingMock = await startMockProvider({ add: () => ({ order: "backup-order-1" }) });
    try {
      const user = await createUser({ balance: 100 });
      const primary = await createProvider({ apiUrl: failingMock.url, name: "Primary" });
      const backup = await createProvider({ apiUrl: workingMock.url, name: "Backup" });
      const { service } = await createCategoryAndService({
        autoSubmit: true,
        providerId: primary.id,
        backupProviderId: backup.id,
        sellPricePer1000: 10,
      });

      const order = await createOrder(user.id, { serviceId: service.id, link: "https://x.com/y", quantity: 1000 }, "auto-key-2");
      await submitPendingOrders();

      const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(updated.providerOrderId).toBe("backup-order-1");
      expect(updated.status).toBe("PROCESSING");
    } finally {
      await failingMock.close();
      await workingMock.close();
    }
  });

  it("marks the order FAILED and refunds the wallet when both primary and backup providers fail", async () => {
    const failingMock1 = await startMockProvider({ add: () => ({ error: "down" }) });
    const failingMock2 = await startMockProvider({ add: () => ({ error: "also down" }) });
    try {
      const user = await createUser({ balance: 100 });
      const primary = await createProvider({ apiUrl: failingMock1.url, name: "Primary" });
      const backup = await createProvider({ apiUrl: failingMock2.url, name: "Backup" });
      const { service } = await createCategoryAndService({
        autoSubmit: true,
        providerId: primary.id,
        backupProviderId: backup.id,
        sellPricePer1000: 10,
      });

      const order = await createOrder(user.id, { serviceId: service.id, link: "https://x.com/y", quantity: 1000 }, "auto-key-3");

      const walletAfterOrder = await getWalletForUser(user.id);
      expect(walletAfterOrder.balance.toString()).toBe("90"); // charged $10 for qty 1000 @ $10/1000

      await submitPendingOrders();

      const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(updated.status).toBe("FAILED");
      expect(updated.providerOrderId).toBeNull();

      // Money is never silently lost to a broken integration: the charge is refunded in full.
      const walletAfterFailure = await getWalletForUser(user.id);
      expect(walletAfterFailure.balance.toString()).toBe("100");
    } finally {
      await failingMock1.close();
      await failingMock2.close();
    }
  });

  it("leaves manual-mode orders untouched", async () => {
    const user = await createUser({ balance: 100 });
    const { service } = await createCategoryAndService({ autoSubmit: false, sellPricePer1000: 10 });
    const order = await createOrder(user.id, { serviceId: service.id, link: "https://x.com/y", quantity: 1000 }, "manual-key-1");

    const result = await submitPendingOrders();
    expect(result.processed).toBe(0);

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updated.status).toBe("PENDING");
    expect(updated.mode).toBe("MANUAL");
  });
});
