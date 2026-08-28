import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import {
  app,
  createBrand,
  createCategoryAndService,
  createPackage,
  createProduct,
  createStockPoolWithCodes,
  createUser,
  resetDb,
} from "./helpers.js";
import { env } from "../src/env.js";
import { getWalletForUser } from "../src/services/wallet.service.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

async function linkStockPool(packageId: string, poolId: string) {
  await prisma.packageStockPool.create({ data: { packageId, poolId } });
}

describe("Store purchase — financial integrity & fulfillment routing", () => {
  it("manual/stock-pool purchase: debits exactly salePrice+extraFee, claims one code, order is COMPLETED and the code is revealable once", async () => {
    const user = await createUser({ balance: 100 });
    const brand = await createBrand();
    const product = await createProduct(brand.id, { userInputFieldName: "Email" });
    const pkg = await createPackage(product.id, { salePrice: 20, extraFee: 2 });
    const pool = await createStockPoolWithCodes(["SECRET-CODE-1"]);
    await linkStockPool(pkg.id, pool.id);

    const res = await request(app)
      .post("/api/store/purchase")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "buy-1")
      .send({ packageId: pkg.id, buyerInput: "buyer@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe("COMPLETED");
    expect(res.body.order.charge).toBe("22"); // 20 salePrice + 2 extraFee
    expect(res.body.deliveredCode).toBe("SECRET-CODE-1");

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("78"); // 100 - 22, exactly once

    const code = await prisma.stockCode.findFirstOrThrow({ where: { poolId: pool.id } });
    expect(code.status).toBe("CONSUMED");
    expect(code.orderId).toBe(res.body.order.id);

    const reveal = await request(app).get(`/api/store/orders/${res.body.order.id}/code`).set("Authorization", `Bearer ${tokenFor(user.id)}`);
    expect(reveal.status).toBe(200);
    expect(reveal.body.code).toBe("SECRET-CODE-1");
  });

  it("out of stock: blocks the purchase before any wallet debit, never creates an order", async () => {
    const user = await createUser({ balance: 100 });
    const brand = await createBrand();
    const product = await createProduct(brand.id);
    const pkg = await createPackage(product.id, { salePrice: 20 });
    const pool = await createStockPoolWithCodes([]); // empty pool
    await linkStockPool(pkg.id, pool.id);

    const res = await request(app)
      .post("/api/store/purchase")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "buy-oos")
      .send({ packageId: pkg.id, buyerInput: "x" });

    expect(res.status).toBe(409);
    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("100");
    const orders = await prisma.order.count({ where: { userId: user.id } });
    expect(orders).toBe(0);
  });

  it("two simultaneous purchases against a single-code pool: exactly one succeeds, the other is told it's out of stock", async () => {
    const buyerA = await createUser({ balance: 100 });
    const buyerB = await createUser({ balance: 100 });
    const brand = await createBrand();
    const product = await createProduct(brand.id);
    const pkg = await createPackage(product.id, { salePrice: 20 });
    const pool = await createStockPoolWithCodes(["ONLY-ONE-CODE"]);
    await linkStockPool(pkg.id, pool.id);

    const [resA, resB] = await Promise.all([
      request(app).post("/api/store/purchase").set("Authorization", `Bearer ${tokenFor(buyerA.id)}`).set("Idempotency-Key", "race-a").send({ packageId: pkg.id, buyerInput: "a" }),
      request(app).post("/api/store/purchase").set("Authorization", `Bearer ${tokenFor(buyerB.id)}`).set("Idempotency-Key", "race-b").send({ packageId: pkg.id, buyerInput: "b" }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const consumedCodes = await prisma.stockCode.count({ where: { poolId: pool.id, status: "CONSUMED" } });
    expect(consumedCodes).toBe(1); // never double-claimed
  });

  it("replaying the same Idempotency-Key returns the same order and never claims a second code or double-charges", async () => {
    const user = await createUser({ balance: 100 });
    const brand = await createBrand();
    const product = await createProduct(brand.id);
    const pkg = await createPackage(product.id, { salePrice: 20 });
    const pool = await createStockPoolWithCodes(["CODE-A", "CODE-B"]);
    await linkStockPool(pkg.id, pool.id);
    const payload = { packageId: pkg.id, buyerInput: "same-buyer" };

    const first = await request(app).post("/api/store/purchase").set("Authorization", `Bearer ${tokenFor(user.id)}`).set("Idempotency-Key", "dup-key").send(payload);
    const second = await request(app).post("/api/store/purchase").set("Authorization", `Bearer ${tokenFor(user.id)}`).set("Idempotency-Key", "dup-key").send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.order.id).toBe(first.body.order.id);

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("80"); // charged exactly once

    const consumed = await prisma.stockCode.count({ where: { poolId: pool.id, status: "CONSUMED" } });
    expect(consumed).toBe(1); // only one code ever claimed
  });

  it("IS AUTO package on an SMM product routes through the existing Service pipeline with the package's own price locked, not the service's", async () => {
    const user = await createUser({ balance: 100 });
    const { service } = await createCategoryAndService({ sellPricePer1000: 999, autoSubmit: true }); // deliberately different price
    const brand = await createBrand();
    const product = await createProduct(brand.id, { productType: "SMM", serviceId: service.id, userInputFieldName: "Link" });
    const pkg = await createPackage(product.id, { salePrice: 15, amount: 500, isAuto: true });

    const res = await request(app)
      .post("/api/store/purchase")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "auto-1")
      .send({ packageId: pkg.id, buyerInput: "https://instagram.com/someone" });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe("PENDING"); // picked up by the existing submitPendingOrders cron, not submitted synchronously
    expect(res.body.order.charge).toBe("15"); // package price, never service.sellPricePer1000 * quantity
    expect(res.body.order.quantity).toBe(500);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: res.body.order.id } });
    expect(order.serviceId).toBe(service.id);
    expect(order.mode).toBe("MANUAL"); // flips to AUTO only once the cron actually submits it

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("85");
  });

  it("rejects IS AUTO on a package whose product has no linked Service — never silently falls back to manual", async () => {
    const user = await createUser({ balance: 100 });
    const brand = await createBrand();
    const product = await createProduct(brand.id, { productType: "TOPUP" }); // no serviceId
    const pkg = await createPackage(product.id, { salePrice: 15, isAuto: true });

    const res = await request(app)
      .post("/api/store/purchase")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "auto-bad")
      .send({ packageId: pkg.id, buyerInput: "x" });

    expect(res.status).toBe(400);
    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("100");
  });

  it("Access Type gating: a VIP-only product rejects a non-VIP user and accepts one after being granted VIP", async () => {
    const user = await createUser({ balance: 100 });
    const brand = await createBrand();
    const product = await createProduct(brand.id, { accessType: "VIP" });
    const pkg = await createPackage(product.id, { salePrice: 10 });

    const blocked = await request(app)
      .post("/api/store/purchase")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "vip-blocked")
      .send({ packageId: pkg.id, buyerInput: "x" });
    expect(blocked.status).toBe(403);

    await prisma.user.update({ where: { id: user.id }, data: { isVip: true } });

    const allowed = await request(app)
      .post("/api/store/purchase")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "vip-allowed")
      .send({ packageId: pkg.id, buyerInput: "x" });
    expect(allowed.status).toBe(201);
  });

  it("enforces the product's order-time-limit across purchases of any of its packages, not just repeats of the same package", async () => {
    const user = await createUser({ balance: 1000 });
    const brand = await createBrand();
    const product = await createProduct(brand.id, { hasOrderTimeLimit: true, maxOrdersPerWindow: 1, orderWindowHours: 24 });
    const pkgA = await createPackage(product.id, { name: "A", salePrice: 10 });
    const pkgB = await createPackage(product.id, { name: "B", salePrice: 10 });

    const first = await request(app)
      .post("/api/store/purchase")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "limit-1")
      .send({ packageId: pkgA.id, buyerInput: "x" });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/store/purchase")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "limit-2")
      .send({ packageId: pkgB.id, buyerInput: "x" });
    expect(second.status).toBe(409);

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("990"); // only the first purchase charged
  });

  it("applies Product.removeCharacters to the buyer's input before storing it", async () => {
    const user = await createUser({ balance: 100 });
    const brand = await createBrand();
    const product = await createProduct(brand.id, { removeCharacters: " -" });
    const pkg = await createPackage(product.id, { salePrice: 5 });

    const res = await request(app)
      .post("/api/store/purchase")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "sanitize-1")
      .send({ packageId: pkg.id, buyerInput: "12-34 56" });

    expect(res.status).toBe(201);
    expect(res.body.order.link).toBe("123456");
  });

  it("a plain manual package (no auto, no stock pools) stays PENDING for an admin to resolve — same convention as a manual Service order", async () => {
    const user = await createUser({ balance: 100 });
    const brand = await createBrand();
    const product = await createProduct(brand.id);
    const pkg = await createPackage(product.id, { salePrice: 10, isManual: true });

    const res = await request(app)
      .post("/api/store/purchase")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "manual-queue")
      .send({ packageId: pkg.id, buyerInput: "x" });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe("PENDING");
    expect(res.body.deliveredCode).toBeNull();

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("90");
  });
});
