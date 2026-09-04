import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createCategoryAndService, createPaymentMethod, createUser, enableGateway, resetDb } from "./helpers.js";
import { env } from "../src/env.js";
import { startMockZiniPay } from "./mocks/zinipay.js";
import { getWalletForUser } from "../src/services/wallet.service.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

// Full round trip for the insufficient-balance redirect flow: submit an
// order the wallet can't cover -> 402 + OrderIntent -> pay the shortfall via
// a gateway, referencing that intent -> deposit confirms -> order is placed
// automatically in the same transaction as the wallet credit.
describe("insufficient-balance order flow (OrderIntent)", () => {
  it("end to end: 402 redirect -> gateway deposit funds the shortfall -> order auto-places on confirm", async () => {
    const mock = await startMockZiniPay({ invoiceId: "intent-inv-1", verify: () => ({ invoiceId: "intent-inv-1", status: "COMPLETED", amount: 5 }) });
    try {
      await enableGateway("ZINIPAY", { apiKey: "test-key", baseUrl: mock.baseUrl });
      const method = await createPaymentMethod({ gatewayType: "AUTOMATED", gatewayProvider: "ZINIPAY" });
      const user = await createUser({ balance: 5 });
      const { service } = await createCategoryAndService({ sellPricePer1000: 10 }); // 1000 qty -> charge $10

      const orderAttempt = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .set("Idempotency-Key", "flow-key-1")
        .send({ serviceId: service.id, link: "https://instagram.com/someone", quantity: 1000 });
      expect(orderAttempt.status).toBe(402);
      const { orderIntentId, shortfall } = orderAttempt.body.details;
      expect(shortfall).toBe("5");

      const intentBefore = await prisma.orderIntent.findUniqueOrThrow({ where: { id: orderIntentId } });
      expect(intentBefore.status).toBe("PENDING");

      const deposit = await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: Number(shortfall), paymentMethodId: method.id, orderIntentId });
      expect(deposit.status).toBe(201);

      const depositRow = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });
      expect(depositRow.orderIntentId).toBe(orderIntentId);

      const callback = await request(app).get(`/api/payments/zinipay/callback?depositId=${depositRow.id}`);
      expect(callback.status).toBe(302);
      expect(callback.headers.location).toContain("deposit=success");

      // Wallet: +5 (deposit) - 10 (order charge) = -5 from the pre-deposit
      // balance of 5, i.e. net 0 — the shortfall exactly covered the order.
      const wallet = await getWalletForUser(user.id);
      expect(wallet.balance.toString()).toBe("0");

      const intentAfter = await prisma.orderIntent.findUniqueOrThrow({ where: { id: orderIntentId } });
      expect(intentAfter.status).toBe("FULFILLED");
      expect(intentAfter.orderId).toBeTruthy();

      const order = await prisma.order.findUniqueOrThrow({ where: { id: intentAfter.orderId! } });
      expect(order.userId).toBe(user.id);
      expect(order.serviceId).toBe(service.id);
      expect(order.charge.toString()).toBe("10");
    } finally {
      await mock.close();
    }
  });

  it("new full-price flow: the 402 carries the whole charge, and paying it leaves the user's pre-existing balance untouched", async () => {
    const mock = await startMockZiniPay({ invoiceId: "intent-inv-full", verify: () => ({ invoiceId: "intent-inv-full", status: "COMPLETED", amount: 10 }) });
    try {
      await enableGateway("ZINIPAY", { apiKey: "test-key", baseUrl: mock.baseUrl });
      const method = await createPaymentMethod({ gatewayType: "AUTOMATED", gatewayProvider: "ZINIPAY" });
      const user = await createUser({ balance: 4 }); // partial balance that must NOT be consumed
      const { service } = await createCategoryAndService({ sellPricePer1000: 10 }); // charge $10

      const orderAttempt = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .set("Idempotency-Key", "flow-full-1")
        .send({ serviceId: service.id, link: "https://instagram.com/someone", quantity: 1000 });
      expect(orderAttempt.status).toBe(402);
      expect(orderAttempt.body.details.kind).toBe("SERVICE");
      expect(orderAttempt.body.details.charge).toBe("10"); // full charge, what the frontend now sends

      const { orderIntentId, charge } = orderAttempt.body.details;
      const deposit = await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: Number(charge), paymentMethodId: method.id, orderIntentId });
      expect(deposit.status).toBe(201);

      const depositRow = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });
      const callback = await request(app).get(`/api/payments/zinipay/callback?depositId=${depositRow.id}`);
      expect(callback.headers.location).toContain("deposit=success");

      // +10 credit, -10 order debit — the pre-existing $4 is left alone.
      const wallet = await getWalletForUser(user.id);
      expect(wallet.balance.toString()).toBe("4");

      const intentAfter = await prisma.orderIntent.findUniqueOrThrow({ where: { id: orderIntentId } });
      expect(intentAfter.status).toBe("FULFILLED");
      const order = await prisma.order.findUniqueOrThrow({ where: { id: intentAfter.orderId! } });
      expect(order.charge.toString()).toBe("10");
    } finally {
      await mock.close();
    }
  });

  it("a deposit that isn't enough to cover the order still credits the wallet, but leaves the intent FAILED (not auto-placed, no money lost)", async () => {
    const mock = await startMockZiniPay({ invoiceId: "intent-inv-2", verify: () => ({ invoiceId: "intent-inv-2", status: "COMPLETED", amount: 1 }) });
    try {
      await enableGateway("ZINIPAY", { apiKey: "test-key", baseUrl: mock.baseUrl });
      const method = await createPaymentMethod({ gatewayType: "AUTOMATED", gatewayProvider: "ZINIPAY", minAmount: 0.2 });
      const user = await createUser({ balance: 5 });
      const { service } = await createCategoryAndService({ sellPricePer1000: 10 }); // charge $10, shortfall $5

      const orderAttempt = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .set("Idempotency-Key", "flow-key-2")
        .send({ serviceId: service.id, link: "https://instagram.com/someone", quantity: 1000 });
      const { orderIntentId } = orderAttempt.body.details;

      // Pays only $1 of the $5 shortfall — deliberately not enough.
      const deposit = await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 1, paymentMethodId: method.id, orderIntentId });
      const depositRow = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });

      const callback = await request(app).get(`/api/payments/zinipay/callback?depositId=${depositRow.id}`);
      expect(callback.status).toBe(302);
      expect(callback.headers.location).toContain("deposit=success"); // the deposit itself still succeeded

      // Wallet still gets credited — 5 + 1 = 6, still short of the $10 charge.
      const wallet = await getWalletForUser(user.id);
      expect(wallet.balance.toString()).toBe("6");

      const intentAfter = await prisma.orderIntent.findUniqueOrThrow({ where: { id: orderIntentId } });
      expect(intentAfter.status).toBe("FAILED");
      expect(intentAfter.orderId).toBeNull();

      const orders = await prisma.order.findMany({ where: { userId: user.id } });
      expect(orders).toHaveLength(0); // never placed — but the $6 is safely sitting in the wallet either way
      void deposit;
    } finally {
      await mock.close();
    }
  });

  it("rejects an orderIntentId that belongs to a different user — falls back to a plain top-up instead", async () => {
    const mock = await startMockZiniPay({ invoiceId: "intent-inv-3", verify: () => ({ invoiceId: "intent-inv-3", status: "COMPLETED", amount: 20 }) });
    try {
      await enableGateway("ZINIPAY", { apiKey: "test-key", baseUrl: mock.baseUrl });
      const method = await createPaymentMethod({ gatewayType: "AUTOMATED", gatewayProvider: "ZINIPAY" });
      const owner = await createUser({ balance: 0 });
      const attacker = await createUser({ balance: 0 });
      const { service } = await createCategoryAndService({ sellPricePer1000: 10 });

      const orderAttempt = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${tokenFor(owner.id)}`)
        .set("Idempotency-Key", "victim-key")
        .send({ serviceId: service.id, link: "https://instagram.com/someone", quantity: 1000 });
      const { orderIntentId } = orderAttempt.body.details;

      // Attacker pays using their own money but references the victim's intent id.
      const deposit = await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(attacker.id)}`)
        .send({ amount: 20, paymentMethodId: method.id, orderIntentId });
      expect(deposit.status).toBe(201);

      const depositRow = await prisma.deposit.findFirstOrThrow({ where: { userId: attacker.id } });
      expect(depositRow.orderIntentId).toBeNull(); // silently dropped, not attached

      await request(app).get(`/api/payments/zinipay/callback?depositId=${depositRow.id}`);

      // Attacker's own wallet got credited normally (it's their own deposit)...
      const attackerWallet = await getWalletForUser(attacker.id);
      expect(attackerWallet.balance.toString()).toBe("20");

      // ...but the victim's intent was never touched, and no order was
      // placed on their behalf using the attacker's money.
      const intent = await prisma.orderIntent.findUniqueOrThrow({ where: { id: orderIntentId } });
      expect(intent.status).toBe("PENDING");
      const victimWallet = await getWalletForUser(owner.id);
      expect(victimWallet.balance.toString()).toBe("0");
    } finally {
      await mock.close();
    }
  });
});
