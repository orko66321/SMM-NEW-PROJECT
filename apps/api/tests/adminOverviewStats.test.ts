import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createCategoryAndService, createUser, resetDb } from "./helpers.js";
import { env } from "../src/env.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

async function getOverview(adminId: string) {
  const res = await request(app)
    .get("/api/admin/stats/overview")
    .set("Authorization", `Bearer ${tokenFor(adminId)}`);
  expect(res.status).toBe(200);
  return res.body;
}

describe("admin dashboard overview stats", () => {
  it("returns real zeros — never null/undefined/NaN — on a fresh install", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const body = await getOverview(admin.id);

    expect(body.orders).toEqual({
      lastMonth: 0,
      thisMonth: 0,
      today: 0,
      total: 0,
      lastMonthLike: 0,
      thisMonthLike: 0,
    });
    // The admin account itself is the only user, and it was just created.
    expect(body.users).toEqual({ today: 1, total: 1 });
    for (const bucket of Object.values(body.sales) as string[]) expect(bucket).toBe("0");
    for (const bucket of Object.values(body.profit) as string[]) expect(bucket).toBe("0");
    expect(body.balances.totalWallet).toBe("0");
    expect(body.ranges.thisMonth.to).toBeNull();
  });

  it("buckets orders/sales/profit into today/yesterday/this-month/last-month correctly, and never mixes non-COMPLETED orders into sales", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const buyer = await createUser();
    const { service } = await createCategoryAndService({});

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const midLastMonth = new Date(startOfLastMonth);
    midLastMonth.setDate(midLastMonth.getDate() + 1);

    await prisma.order.create({
      data: { userId: buyer.id, serviceId: service.id, link: "https://x.com/today", quantity: 100, charge: 100, providerCost: 40, status: "COMPLETED", createdAt: startOfToday },
    });
    // Same-day but PENDING — must count toward "Today Orders" but NOT toward any sale/profit figure.
    await prisma.order.create({
      data: { userId: buyer.id, serviceId: service.id, link: "https://x.com/pending", quantity: 100, charge: 999, providerCost: 1, status: "PENDING", createdAt: startOfToday },
    });
    await prisma.order.create({
      data: { userId: buyer.id, serviceId: service.id, link: "https://x.com/yesterday", quantity: 100, charge: 50, providerCost: 20, status: "COMPLETED", createdAt: startOfYesterday },
    });
    await prisma.order.create({
      data: { userId: buyer.id, serviceId: service.id, link: "https://x.com/lastmonth", quantity: 100, charge: 20, providerCost: 5, status: "COMPLETED", createdAt: midLastMonth },
    });

    const body = await getOverview(admin.id);
    // Whether yesterday's order additionally falls inside "this month"
    // depends on whether today is the 1st of the month (test-environment
    // clock dependent), so both order-count and sales assertions branch on it.
    const yesterdayInThisMonth = startOfYesterday >= startOfThisMonth;

    expect(body.orders.today).toBe(2);
    expect(body.orders.thisMonth).toBe(yesterdayInThisMonth ? 3 : 2);
    expect(body.orders.lastMonth).toBe(1);
    expect(body.orders.total).toBe(4);

    expect(body.sales.today).toBe("100");
    expect(body.profit.today).toBe("60");
    expect(body.sales.yesterday).toBe("50");
    expect(body.profit.yesterday).toBe("30");
    expect(body.sales.lastMonth).toBe("20");
    expect(body.profit.lastMonth).toBe("15");
    // this month always includes today's COMPLETED order (100); it only
    // additionally includes yesterday's if yesterday is still this month.
    expect(body.sales.thisMonth).toBe(yesterdayInThisMonth ? "150" : "100");
    expect(body.sales.lifeTime).toBe("170");
    expect(body.profit.lifeTime).toBe("105");
  });

  it("Like Orders cards only count orders under a service category whose name contains 'Like'", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const buyer = await createUser();
    const { service: regularService } = await createCategoryAndService({});
    const likeCategory = await prisma.serviceCategory.create({ data: { name: "Instagram Likes", platform: "Instagram", sortOrder: 1 } });
    const likeService = await prisma.service.create({
      data: {
        categoryId: likeCategory.id,
        name: "IG Likes",
        sellPricePer1000: 5,
        providerCostPer1000: 2,
        minQuantity: 10,
        maxQuantity: 10000,
        status: "ACTIVE",
      },
    });

    await prisma.order.create({
      data: { userId: buyer.id, serviceId: regularService.id, link: "https://x.com/a", quantity: 100, charge: 10, providerCost: 5, status: "COMPLETED" },
    });
    await prisma.order.create({
      data: { userId: buyer.id, serviceId: likeService.id, link: "https://x.com/b", quantity: 100, charge: 10, providerCost: 5, status: "COMPLETED" },
    });

    const body = await getOverview(admin.id);
    expect(body.orders.thisMonthLike).toBe(1);
    expect(body.orders.thisMonth).toBe(2);
  });

  it("Total Wallet sums every user's current wallet balance", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await createUser({ balance: 25.5 });
    await createUser({ balance: 74.5 });

    const body = await getOverview(admin.id);
    expect(body.balances.totalWallet).toBe("100");
  });

  it("the returned date ranges match what the orders list's from/to filter actually returns", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const buyer = await createUser();
    const { service } = await createCategoryAndService({});
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    await prisma.order.create({
      data: { userId: buyer.id, serviceId: service.id, link: "https://x.com/today", quantity: 100, charge: 10, providerCost: 5, status: "COMPLETED", createdAt: startOfToday },
    });

    const overview = await getOverview(admin.id);
    const { from, to } = overview.ranges.today;

    const listRes = await request(app)
      .get("/api/admin/orders")
      .query({ from, to })
      .set("Authorization", `Bearer ${tokenFor(admin.id)}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(overview.orders.today);
  });
});
