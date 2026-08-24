import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createProvider, resetDb } from "./helpers.js";
import { deleteProvider } from "../src/services/providers.service.js";
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
