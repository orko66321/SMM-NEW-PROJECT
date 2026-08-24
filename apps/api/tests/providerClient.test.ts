import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createProvider, resetDb } from "./helpers.js";
import { startMockProvider } from "./mocks/japProvider.js";
import {
  getProviderBalance,
  getProviderOrderStatus,
  getProviderOrderStatusBulk,
  listProviderServices,
  submitProviderOrder,
} from "../src/services/providerClient.service.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

describe("providerClient (JAP-standard reseller API)", () => {
  it("parses services, add, status, status_multi, and balance responses", async () => {
    const mock = await startMockProvider({
      services: () => [{ service: "1", name: "Test Service", rate: "5.00", min: "100", max: "10000" }],
      add: (params) => (params.get("service") === "fail" ? { error: "Unknown service" } : { order: "9001" }),
      status: (params) =>
        params.has("orders")
          ? { "9001": { status: "Completed", start_count: "0", remains: "0" } }
          : { status: "Completed", start_count: "0", remains: "0" },
      balance: () => ({ balance: "42.50", currency: "USD" }),
    });

    try {
      const provider = await createProvider({ apiUrl: mock.url });

      const services = await listProviderServices(provider);
      expect(services).toEqual([{ service: "1", name: "Test Service", rate: "5.00", min: "100", max: "10000" }]);

      const orderId = await submitProviderOrder(provider, { service: "1", link: "https://x.com/y", quantity: 100 });
      expect(orderId).toBe("9001");

      const status = await getProviderOrderStatus(provider, "9001");
      expect(status.status).toBe("Completed");

      const bulk = await getProviderOrderStatusBulk(provider, ["9001"]);
      expect(bulk["9001"]?.status).toBe("Completed");

      const balance = await getProviderBalance(provider);
      expect(balance.balance).toBe("42.50");
    } finally {
      await mock.close();
    }
  });

  it("normalizes a provider's numeric service/rate/min/max fields to strings (found live against smmgen.com/PerfectPanel, which returns real JSON numbers, not the JAP-standard dialect's implied strings)", async () => {
    const mock = await startMockProvider({
      // Deliberately raw numbers, not strings — exactly what broke Map
      // lookups keyed on providerServiceId before this was fixed.
      services: () => [{ service: 18801, name: "Numeric ID Service", category: "Facebook", rate: 0.096, min: 100, max: 100000, refill: false, cancel: true }],
    });
    try {
      const provider = await createProvider({ apiUrl: mock.url });
      const services = await listProviderServices(provider);
      expect(services).toHaveLength(1);
      const entry = services[0]!;
      expect(entry.service).toBe("18801");
      expect(typeof entry.service).toBe("string");
      expect(entry.rate).toBe("0.096");
      expect(entry.min).toBe("100");
      expect(entry.max).toBe("100000");
    } finally {
      await mock.close();
    }
  });

  it("throws on a provider error response and writes a ProviderSyncLog(FAILURE) row", async () => {
    const mock = await startMockProvider({
      add: () => ({ error: "Insufficient provider balance" }),
    });

    try {
      const provider = await createProvider({ apiUrl: mock.url });

      await expect(
        submitProviderOrder(provider, { service: "fail", link: "https://x.com/y", quantity: 100 }),
      ).rejects.toThrow();

      const logs = await prisma.providerSyncLog.findMany({ where: { providerId: provider.id } });
      expect(logs).toHaveLength(1);
      expect(logs[0]?.status).toBe("FAILURE");
      expect(logs[0]?.action).toBe("add");
    } finally {
      await mock.close();
    }
  });

  it("logs SUCCESS for a well-formed response", async () => {
    const mock = await startMockProvider({ balance: () => ({ balance: "10.00", currency: "USD" }) });
    try {
      const provider = await createProvider({ apiUrl: mock.url });
      await getProviderBalance(provider);
      const logs = await prisma.providerSyncLog.findMany({ where: { providerId: provider.id } });
      expect(logs).toHaveLength(1);
      expect(logs[0]?.status).toBe("SUCCESS");
    } finally {
      await mock.close();
    }
  });
});
