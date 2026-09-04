import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import {
  app,
  createBrand,
  createPackage,
  createPaymentMethod,
  createProduct,
  createStockPoolWithCodes,
  createUser,
  enableGateway,
  resetDb,
} from "./helpers.js";
import { env } from "../src/env.js";
import { startMockZiniPay } from "./mocks/zinipay.js";
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

// Store checkout's wallet + ZiniPay fallback: when the wallet can't cover a
// package, the user pays the FULL price via ZiniPay (never balance-adjusted)
// and the order places itself once the payment is confirmed — the user's
// pre-existing wallet balance is left untouched (net-zero: credit full,
// order debits it right back).
describe("Store checkout — wallet + ZiniPay fallback (PACKAGE OrderIntent)", () => {
  it("sufficient balance: buys straight from the wallet, never creates an OrderIntent or touches ZiniPay", async () => {
    const user = await createUser({ balance: 100 });
    const brand = await createBrand();
    const product = await createProduct(brand.id);
    const pkg = await createPackage(product.id, { salePrice: 20, extraFee: 2 });
    const pool = await createStockPoolWithCodes(["CODE-SUFFICIENT"]);
    await linkStockPool(pkg.id, pool.id);

    const res = await request(app)
      .post("/api/store/purchase")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .set("Idempotency-Key", "store-suff-1")
      .send({ packageId: pkg.id, buyerInput: "buyer@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe("COMPLETED");
    expect(res.body.deliveredCode).toBe("CODE-SUFFICIENT");

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("78"); // 100 - 22
    expect(await prisma.orderIntent.count({ where: { userId: user.id } })).toBe(0);
  });

  it("end to end: 402 -> ZiniPay pays the FULL price -> order auto-places on confirm -> pre-existing balance untouched", async () => {
    const mock = await startMockZiniPay({
      invoiceId: "store-inv-1",
      verify: () => ({ invoice_id: "store-inv-1", status: "COMPLETED", amount: 22 }),
    });
    try {
      await enableGateway("ZINIPAY", { apiKey: "test-key", baseUrl: mock.baseUrl });
      const method = await createPaymentMethod({ gatewayType: "AUTOMATED", gatewayProvider: "ZINIPAY" });
      const user = await createUser({ balance: 10 }); // partial — deliberately NOT enough, and NOT to be consumed
      const brand = await createBrand();
      const product = await createProduct(brand.id, { slug: "zini-voucher", userInputFieldName: "Email" });
      const pkg = await createPackage(product.id, { salePrice: 20, extraFee: 2 });
      const pool = await createStockPoolWithCodes(["SECRET-STORE-CODE"]);
      await linkStockPool(pkg.id, pool.id);

      const attempt = await request(app)
        .post("/api/store/purchase")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .set("Idempotency-Key", "store-flow-1")
        .send({ packageId: pkg.id, buyerInput: "buyer@example.com" });

      expect(attempt.status).toBe(402);
      expect(attempt.body.details.kind).toBe("PACKAGE");
      expect(attempt.body.details.charge).toBe("22"); // FULL price, not the 12 shortfall
      const { orderIntentId } = attempt.body.details;

      // No money moved, no order yet.
      expect((await getWalletForUser(user.id)).balance.toString()).toBe("10");
      expect(await prisma.order.count({ where: { userId: user.id } })).toBe(0);

      const deposit = await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 22, paymentMethodId: method.id, orderIntentId });
      expect(deposit.status).toBe(201);

      const depositRow = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });
      expect(depositRow.orderIntentId).toBe(orderIntentId);

      const callback = await request(app).get(`/api/payments/zinipay/callback?depositId=${depositRow.id}`);
      expect(callback.status).toBe(302);
      // Lands back on the Store checkout for that exact package, not the wallet.
      expect(callback.headers.location).toContain("/dashboard/store?");
      expect(callback.headers.location).toContain("purchase=success");
      expect(callback.headers.location).toContain("product=zini-voucher");
      expect(callback.headers.location).toContain(`pkg=${pkg.id}`);

      // Net-zero: +22 deposit credit, -22 order debit — the pre-existing $10 is untouched.
      expect((await getWalletForUser(user.id)).balance.toString()).toBe("10");

      const intent = await prisma.orderIntent.findUniqueOrThrow({ where: { id: orderIntentId } });
      expect(intent.status).toBe("FULFILLED");
      expect(intent.orderId).toBeTruthy();

      const order = await prisma.order.findUniqueOrThrow({ where: { id: intent.orderId! } });
      expect(order.userId).toBe(user.id);
      expect(order.packageId).toBe(pkg.id);
      expect(order.status).toBe("COMPLETED");
      expect(order.charge.toString()).toBe("22");

      const code = await prisma.stockCode.findFirstOrThrow({ where: { poolId: pool.id } });
      expect(code.status).toBe("CONSUMED");
      expect(code.orderId).toBe(order.id);

      const reveal = await request(app)
        .get(`/api/store/orders/${order.id}/code`)
        .set("Authorization", `Bearer ${tokenFor(user.id)}`);
      expect(reveal.status).toBe(200);
      expect(reveal.body.code).toBe("SECRET-STORE-CODE");
    } finally {
      await mock.close();
    }
  });

  it("confirming the same payment twice (callback + webhook) never creates a second order or double-charges", async () => {
    const mock = await startMockZiniPay({
      invoiceId: "store-inv-2",
      verify: () => ({ invoice_id: "store-inv-2", status: "COMPLETED", amount: 15 }),
    });
    try {
      await enableGateway("ZINIPAY", { apiKey: "test-key", baseUrl: mock.baseUrl });
      const method = await createPaymentMethod({ gatewayType: "AUTOMATED", gatewayProvider: "ZINIPAY" });
      const user = await createUser({ balance: 0 });
      const brand = await createBrand();
      const product = await createProduct(brand.id);
      const pkg = await createPackage(product.id, { salePrice: 15 });
      const pool = await createStockPoolWithCodes(["CODE-DUP-1", "CODE-DUP-2"]);
      await linkStockPool(pkg.id, pool.id);

      const attempt = await request(app)
        .post("/api/store/purchase")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .set("Idempotency-Key", "store-dup-1")
        .send({ packageId: pkg.id, buyerInput: "x" });
      const { orderIntentId } = attempt.body.details;

      await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 15, paymentMethodId: method.id, orderIntentId });
      const depositRow = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });

      await request(app).get(`/api/payments/zinipay/callback?depositId=${depositRow.id}`);
      await request(app).post(`/api/payments/zinipay/webhook`).send({ invoice_id: "store-inv-2" });
      await request(app).post(`/api/payments/zinipay/webhook`).send({ invoice_id: "store-inv-2" });

      expect(await prisma.order.count({ where: { userId: user.id } })).toBe(1);
      expect(await prisma.stockCode.count({ where: { poolId: pool.id, status: "CONSUMED" } })).toBe(1);
      expect((await getWalletForUser(user.id)).balance.toString()).toBe("0"); // +15 -15, once
    } finally {
      await mock.close();
    }
  });

  it("payment fails on ZiniPay's side: no order, no wallet change, lands back on the checkout page", async () => {
    const mock = await startMockZiniPay({
      invoiceId: "store-inv-3",
      verify: () => ({ invoice_id: "store-inv-3", status: "FAILED" }),
    });
    try {
      await enableGateway("ZINIPAY", { apiKey: "test-key", baseUrl: mock.baseUrl });
      const method = await createPaymentMethod({ gatewayType: "AUTOMATED", gatewayProvider: "ZINIPAY" });
      const user = await createUser({ balance: 5 });
      const brand = await createBrand();
      const product = await createProduct(brand.id, { slug: "fail-voucher" });
      const pkg = await createPackage(product.id, { salePrice: 30 });

      const attempt = await request(app)
        .post("/api/store/purchase")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .set("Idempotency-Key", "store-fail-1")
        .send({ packageId: pkg.id, buyerInput: "x" });
      const { orderIntentId } = attempt.body.details;

      await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 30, paymentMethodId: method.id, orderIntentId });
      const depositRow = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });

      const callback = await request(app).get(`/api/payments/zinipay/callback?depositId=${depositRow.id}`);
      expect(callback.status).toBe(302);
      expect(callback.headers.location).toContain("/dashboard/store?");
      expect(callback.headers.location).toContain("purchase=failed");

      expect((await getWalletForUser(user.id)).balance.toString()).toBe("5");
      expect(await prisma.order.count({ where: { userId: user.id } })).toBe(0);
      const intent = await prisma.orderIntent.findUniqueOrThrow({ where: { id: orderIntentId } });
      expect(intent.status).toBe("PENDING"); // deposit rejected, intent never fulfilled
    } finally {
      await mock.close();
    }
  });
});
