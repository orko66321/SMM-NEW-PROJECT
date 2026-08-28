import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createProvider, resetDb } from "./helpers.js";
import { deleteProvider, syncProviderCatalog } from "../src/services/providers.service.js";
import { bulkImportProviderServices } from "../src/services/providerImport.service.js";
import { startMockProvider } from "./mocks/japProvider.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

describe("provider deletion", () => {
  it("deletes a provider with no services mapped to it", async () => {
    const provider = await createProvider();
    await deleteProvider(provider.id);
    const found = await prisma.provider.findUnique({ where: { id: provider.id } });
    expect(found).toBeNull();
  });

  it("cascades ProviderSyncLog rows on delete", async () => {
    const provider = await createProvider();
    await prisma.providerSyncLog.create({ data: { providerId: provider.id, action: "services", status: "SUCCESS" } });
    await deleteProvider(provider.id);
    const logs = await prisma.providerSyncLog.findMany({ where: { providerId: provider.id } });
    expect(logs).toHaveLength(0);
  });

  it("blocks deleting a provider with mapped services — disable/reassign instead, same as payment methods and coupons", async () => {
    const mock = await startMockProvider({
      services: () => [{ service: "1", name: "Test", category: "Instagram", rate: "1.0", min: "100", max: "10000" }],
    });
    try {
      const provider = await createProvider({ apiUrl: mock.url });
      await bulkImportProviderServices(provider.id, { providerServiceIds: ["1"], markupPercent: 10, autoSubmit: false });

      await expect(deleteProvider(provider.id)).rejects.toThrow(/services mapped/i);

      const stillExists = await prisma.provider.findUnique({ where: { id: provider.id } });
      expect(stillExists).not.toBeNull();
    } finally {
      await mock.close();
    }
  });

  it("throws a clear not-found error for an unknown provider id", async () => {
    await expect(deleteProvider("does-not-exist")).rejects.toThrow(/not found/i);
  });
});

describe("provider catalog sync", () => {
  it("backfills description (and refreshes cost) on services imported before the provider had — or before we captured — a desc field", async () => {
    // Imported with no `desc` at all, same as every service imported before
    // this feature existed.
    const mock = await startMockProvider({
      services: () => [{ service: "1", name: "Test", category: "Instagram", rate: "1.0", min: "100", max: "10000" }],
    });
    let provider;
    try {
      provider = await createProvider({ apiUrl: mock.url });
      await bulkImportProviderServices(provider.id, { providerServiceIds: ["1"], markupPercent: 10, autoSubmit: false });
    } finally {
      await mock.close();
    }

    const beforeSync = await prisma.service.findFirst({ where: { providerId: provider.id, providerServiceId: "1" } });
    expect(beforeSync?.description).toBeNull();

    // Provider now returns an updated cost and a desc — as if smmgen.com
    // added package details after the fact, or we're syncing for the
    // first time since this feature shipped.
    const mock2 = await startMockProvider({
      services: () => [{
        service: "1",
        name: "Test",
        category: "Instagram",
        rate: "1.25",
        min: "100",
        max: "10000",
        desc: "Link: post URL\nStart: Instant\nSpeed: 50k/day\nRefill: 30 days",
      }],
    });
    try {
      await prisma.provider.update({ where: { id: provider.id }, data: { apiUrl: mock2.url } });
      const result = await syncProviderCatalog(provider.id);
      expect(result.updatedCount).toBe(1);
    } finally {
      await mock2.close();
    }

    const afterSync = await prisma.service.findFirst({ where: { providerId: provider.id, providerServiceId: "1" } });
    expect(afterSync?.description).toBe("Link: post URL\nStart: Instant\nSpeed: 50k/day\nRefill: 30 days");
    expect(afterSync?.providerCostPer1000.toString()).toBe("1.25");
    // sellPricePer1000 (the admin's margin) must never move on a sync.
    expect(afterSync?.sellPricePer1000.toString()).toBe(beforeSync?.sellPricePer1000.toString());
  });
});
