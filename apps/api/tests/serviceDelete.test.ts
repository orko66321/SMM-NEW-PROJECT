import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCategoryAndService, createUser, resetDb } from "./helpers.js";
import { deleteService } from "../src/services/catalog.service.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

describe("service deletion", () => {
  it("hard-deletes a service that nothing references", async () => {
    const { service } = await createCategoryAndService();
    await deleteService(service.id);
    expect(await prisma.service.findUnique({ where: { id: service.id } })).toBeNull();
  });

  it("blocks deleting a service with orders — disable it instead", async () => {
    const { service } = await createCategoryAndService();
    const user = await createUser();
    await prisma.order.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        link: "https://example.com/x",
        quantity: 100,
        charge: 1,
        providerCost: 0.5,
      },
    });

    await expect(deleteService(service.id)).rejects.toThrow(/orders or other records/i);
    expect(await prisma.service.findUnique({ where: { id: service.id } })).not.toBeNull();
  });

  it("blocks deleting a service that a store product still points at", async () => {
    const { service } = await createCategoryAndService();
    const brand = await prisma.brand.create({ data: { name: "B", level: 0 } });
    await prisma.product.create({
      data: {
        brandId: brand.id,
        name: "P",
        slug: `p-${Math.random().toString(36).slice(2, 8)}`,
        salePrice: 0,
        productType: "SMM",
        accessType: "ALL",
        serviceId: service.id,
        userInputFieldName: "Link",
      },
    });

    await expect(deleteService(service.id)).rejects.toThrow(/orders or other records/i);
  });

  it("throws a clear not-found error for an unknown service id", async () => {
    await expect(deleteService("does-not-exist")).rejects.toThrow(/not found/i);
  });
});
