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

async function getLeaderboard(userId: string) {
  const res = await request(app)
    .get("/api/leaderboard/top-spenders")
    .set("Authorization", `Bearer ${tokenFor(userId)}`);
  expect(res.status).toBe(200);
  return res.body.items as Array<{ rank: number; userId: string; displayName: string; spendPoints: number }>;
}

describe("GET /leaderboard/top-spenders", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/leaderboard/top-spenders");
    expect(res.status).toBe(401);
  });

  it("returns an empty list on a fresh install — never fabricated rows", async () => {
    const viewer = await createUser();
    const items = await getLeaderboard(viewer.id);
    expect(items).toEqual([]);
  });

  it("ranks real users by lifetime COMPLETED-order spend, descending, and ignores non-COMPLETED orders", async () => {
    const viewer = await createUser();
    const bigSpender = await createUser();
    const smallSpender = await createUser();
    const { service } = await createCategoryAndService({});

    await prisma.order.create({
      data: { userId: bigSpender.id, serviceId: service.id, link: "https://x.com/a", quantity: 100, charge: 500, providerCost: 200, status: "COMPLETED" },
    });
    await prisma.order.create({
      data: { userId: smallSpender.id, serviceId: service.id, link: "https://x.com/b", quantity: 100, charge: 50, providerCost: 20, status: "COMPLETED" },
    });
    // Never paid out — must not count toward spend or appear ranked above a real spender.
    await prisma.order.create({
      data: { userId: smallSpender.id, serviceId: service.id, link: "https://x.com/c", quantity: 100, charge: 9999, providerCost: 1, status: "PENDING" },
    });

    const items = await getLeaderboard(viewer.id);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ rank: 1, userId: bigSpender.id, spendPoints: 500 });
    expect(items[1]).toMatchObject({ rank: 2, userId: smallSpender.id, spendPoints: 50 });
  });

  it("sums multiple COMPLETED orders from the same user into one ranked spend total", async () => {
    const viewer = await createUser();
    const buyer = await createUser();
    const { service } = await createCategoryAndService({});

    await prisma.order.create({
      data: { userId: buyer.id, serviceId: service.id, link: "https://x.com/1", quantity: 100, charge: 30, providerCost: 10, status: "COMPLETED" },
    });
    await prisma.order.create({
      data: { userId: buyer.id, serviceId: service.id, link: "https://x.com/2", quantity: 100, charge: 20, providerCost: 10, status: "COMPLETED" },
    });

    const items = await getLeaderboard(viewer.id);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ rank: 1, userId: buyer.id, spendPoints: 50 });
  });

  it("caps the ranking at the top 10 spenders", async () => {
    const viewer = await createUser();
    const { service } = await createCategoryAndService({});

    for (let i = 0; i < 12; i++) {
      const buyer = await createUser();
      await prisma.order.create({
        data: { userId: buyer.id, serviceId: service.id, link: `https://x.com/${i}`, quantity: 100, charge: 100 - i, providerCost: 10, status: "COMPLETED" },
      });
    }

    const items = await getLeaderboard(viewer.id);
    expect(items).toHaveLength(10);
    expect(items[0].spendPoints).toBe(100);
    expect(items[9].spendPoints).toBe(91);
  });
});
