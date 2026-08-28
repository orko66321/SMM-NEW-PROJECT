import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createProvider, createUser, resetDb } from "./helpers.js";
import { startMockProvider } from "./mocks/japProvider.js";
import { bulkImportProviderServices, previewProviderImport } from "../src/services/providerImport.service.js";
import { prisma } from "../src/lib/prisma.js";
import { env } from "../src/env.js";

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

beforeEach(resetDb);
afterEach(resetDb);

const CATALOG = [
  { service: "101", name: "Instagram Followers | Real", category: "Instagram Followers", rate: "1.50", min: "100", max: "50000", refill: true, cancel: false, desc: "High-quality real followers, no drop guarantee, gradual delivery over 24-48h." },
  { service: "102", name: "Instagram Likes", category: "Instagram Followers", rate: "0.80", min: "50", max: "20000", refill: false, cancel: true },
  { service: "103", name: "YouTube Views", category: "YouTube Views", rate: "3.20", min: "1000", max: "1000000", refill: false, cancel: false },
  // Deliberately malformed — a real mega-panel catalog of a few thousand
  // rows will have the occasional bad one; this must not block the rest.
  { service: "104", name: "Broken Service", category: "Other", rate: "not-a-number", min: "10", max: "100" },
];

describe("provider bulk import (mysmmgen.com-style JAP catalog)", () => {
  it("preview shows new vs already-imported vs invalid without creating anything", async () => {
    const mock = await startMockProvider({ services: () => CATALOG });
    try {
      const provider = await createProvider({ apiUrl: mock.url });

      const preview = await previewProviderImport(provider.id);
      expect(preview.total).toBe(4);
      expect(preview.importable).toBe(3);
      expect(preview.invalid).toBe(1);
      expect(preview.alreadyImported).toBe(0);

      const brokenRow = preview.items.find((i) => i.providerServiceId === "104");
      expect(brokenRow?.invalidReason).toMatch(/invalid/i);

      const followersRow = preview.items.find((i) => i.providerServiceId === "101");
      expect(followersRow?.description).toBe("High-quality real followers, no drop guarantee, gradual delivery over 24-48h.");
      const likesRow = preview.items.find((i) => i.providerServiceId === "102");
      expect(likesRow?.description).toBeNull();

      // Nothing created yet — preview is read-only.
      const count = await prisma.service.count();
      expect(count).toBe(0);
    } finally {
      await mock.close();
    }
  });

  it("imports selected services with markup applied, auto-creating and deduping categories", async () => {
    const mock = await startMockProvider({ services: () => CATALOG });
    try {
      const provider = await createProvider({ apiUrl: mock.url });

      const result = await bulkImportProviderServices(provider.id, {
        providerServiceIds: ["101", "102", "103"],
        markupPercent: 20,
        autoSubmit: false,
      });

      expect(result.requested).toBe(3);
      expect(result.imported).toBe(3);
      expect(result.alreadySkipped).toBe(0);
      expect(result.invalidSkipped).toEqual([]);
      expect(result.notFoundSkipped).toEqual([]);

      const services = await prisma.service.findMany({ orderBy: { providerServiceId: "asc" }, include: { category: true } });
      expect(services).toHaveLength(3);

      const followers = services.find((s) => s.providerServiceId === "101")!;
      expect(followers.name).toBe("Instagram Followers | Real");
      expect(followers.description).toBe("High-quality real followers, no drop guarantee, gradual delivery over 24-48h.");
      expect(followers.providerCostPer1000.toString()).toBe("1.5");
      expect(followers.sellPricePer1000.toString()).toBe("1.8"); // 1.50 * 1.20
      expect(followers.minQuantity).toBe(100);
      expect(followers.maxQuantity).toBe(50000);
      expect(followers.refillEnabled).toBe(true);
      expect(followers.autoSubmit).toBe(false);
      expect(followers.category.platform).toBe("Instagram");

      // "101" and "102" share the same category string — must be one row, not two.
      const categories = await prisma.serviceCategory.findMany();
      expect(categories.map((c) => c.name).sort()).toEqual(["Instagram Followers", "YouTube Views"]);

      const likes = services.find((s) => s.providerServiceId === "102")!;
      expect(likes.categoryId).toBe(followers.categoryId);
    } finally {
      await mock.close();
    }
  });

  it("skips the invalid row with a reason instead of failing the whole batch", async () => {
    const mock = await startMockProvider({ services: () => CATALOG });
    try {
      const provider = await createProvider({ apiUrl: mock.url });

      const result = await bulkImportProviderServices(provider.id, {
        providerServiceIds: ["103", "104"],
        markupPercent: 10,
        autoSubmit: false,
      });

      expect(result.imported).toBe(1); // only 103
      expect(result.invalidSkipped).toHaveLength(1);
      expect(result.invalidSkipped[0]?.providerServiceId).toBe("104");

      const count = await prisma.service.count();
      expect(count).toBe(1);
    } finally {
      await mock.close();
    }
  });

  it("reports requested ids that no longer exist in the provider's live catalog", async () => {
    const mock = await startMockProvider({ services: () => CATALOG });
    try {
      const provider = await createProvider({ apiUrl: mock.url });

      const result = await bulkImportProviderServices(provider.id, {
        providerServiceIds: ["101", "does-not-exist-999"],
        markupPercent: 15,
        autoSubmit: false,
      });

      expect(result.imported).toBe(1);
      expect(result.notFoundSkipped).toEqual(["does-not-exist-999"]);
    } finally {
      await mock.close();
    }
  });

  it("re-running an import never creates duplicates — the DB constraint is the real guard", async () => {
    const mock = await startMockProvider({ services: () => CATALOG });
    try {
      const provider = await createProvider({ apiUrl: mock.url });
      const input = { providerServiceIds: ["101", "102"], markupPercent: 20, autoSubmit: false };

      const first = await bulkImportProviderServices(provider.id, input);
      expect(first.imported).toBe(2);

      const second = await bulkImportProviderServices(provider.id, input);
      expect(second.imported).toBe(0);
      expect(second.alreadySkipped).toBe(2);

      const count = await prisma.service.count();
      expect(count).toBe(2); // not 4
    } finally {
      await mock.close();
    }
  });

  it("respects the autoSubmit flag for the whole batch", async () => {
    const mock = await startMockProvider({ services: () => CATALOG });
    try {
      const provider = await createProvider({ apiUrl: mock.url });

      await bulkImportProviderServices(provider.id, {
        providerServiceIds: ["103"],
        markupPercent: 0,
        autoSubmit: true,
      });

      const service = await prisma.service.findFirstOrThrow({ where: { providerServiceId: "103" } });
      expect(service.autoSubmit).toBe(true);
      expect(service.sellPricePer1000.toString()).toBe("3.2"); // 0% markup
    } finally {
      await mock.close();
    }
  });

  it("marks a preview row as alreadyImported after it's been imported", async () => {
    const mock = await startMockProvider({ services: () => CATALOG });
    try {
      const provider = await createProvider({ apiUrl: mock.url });
      await bulkImportProviderServices(provider.id, { providerServiceIds: ["101"], markupPercent: 20, autoSubmit: false });

      const preview = await previewProviderImport(provider.id);
      const row = preview.items.find((i) => i.providerServiceId === "101");
      expect(row?.alreadyImported).toBe(true);
      expect(preview.alreadyImported).toBe(1);
      expect(preview.importable).toBe(2); // 102, 103 (104 is invalid, not importable)
    } finally {
      await mock.close();
    }
  });

  it("accepts a real-mega-panel-sized selection through the actual HTTP route — regression test for a real bug: the array cap was 5000, but my.smmgen.com alone has ~7,800 services, so selecting everything failed request validation", async () => {
    const bigCatalog = Array.from({ length: 7838 }, (_, i) => ({
      service: String(1000 + i),
      name: `Service #${i}`,
      category: "Instagram",
      rate: "1.00",
      min: "100",
      max: "10000",
    }));
    const mock = await startMockProvider({ services: () => bigCatalog });
    try {
      const provider = await createProvider({ apiUrl: mock.url });
      const admin = await createUser({ role: "ADMIN" });

      const res = await request(app)
        .post(`/api/admin/providers/${provider.id}/import`)
        .set("Authorization", `Bearer ${tokenFor(admin.id)}`)
        .send({ providerServiceIds: bigCatalog.map((s) => s.service), markupPercent: 20, autoSubmit: false });

      expect(res.status).toBe(201);
      expect(res.body.imported).toBe(7838);
    } finally {
      await mock.close();
    }
  });
});
