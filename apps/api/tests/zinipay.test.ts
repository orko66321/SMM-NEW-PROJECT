import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createUser, enableGateway, resetDb } from "./helpers.js";
import { env } from "../src/env.js";
import { startMockZiniPay } from "./mocks/zinipay.js";
import { getWalletForUser } from "../src/services/wallet.service.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

async function enableMockZiniPay(baseUrl: string) {
  await enableGateway("ZINIPAY", { apiKey: "test-key", baseUrl });
}

describe("ZiniPay integration (Phase 3)", () => {
  it("browser callback: creates a deposit, confirms via our own reference, and credits the wallet", async () => {
    const mock = await startMockZiniPay({ invoiceId: "inv-1", verify: () => ({ invoice_id: "inv-1", status: "COMPLETED", amount: 25 }) });
    try {
      await enableMockZiniPay(mock.baseUrl);
      const user = await createUser({ balance: 0 });

      const initiate = await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 25 });
      expect(initiate.status).toBe(201);
      expect(initiate.body.redirectUrl).toContain("secure.zinipay.com");

      const { prisma } = await import("../src/lib/prisma.js");
      const deposit = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });
      expect(deposit.gatewayRef).toBe("inv-1");

      const callback = await request(app).get(`/api/payments/zinipay/callback?depositId=${deposit.id}`);
      expect(callback.status).toBe(302);
      expect(callback.headers.location).toContain("deposit=success");

      const wallet = await getWalletForUser(user.id);
      expect(wallet.balance.toString()).toBe("25");
    } finally {
      await mock.close();
    }
  });

  it("webhook trust boundary: a fabricated 'status: true' in the webhook body cannot credit if our own verify() says FAILED", async () => {
    const mock = await startMockZiniPay({ verify: () => ({ invoice_id: "inv-2", status: "FAILED" }) });
    try {
      await enableMockZiniPay(mock.baseUrl);
      const user = await createUser({ balance: 0 });

      await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 25 });

      const { prisma } = await import("../src/lib/prisma.js");
      const deposit = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });

      const webhook = await request(app)
        .post("/api/payments/zinipay/webhook")
        .send({ invoice_id: deposit.gatewayRef, status: "true" }); // attacker/gateway claims success
      expect(webhook.status).toBe(200);

      const wallet = await getWalletForUser(user.id);
      expect(wallet.balance.toString()).toBe("0"); // never credited — our own verify() said FAILED
    } finally {
      await mock.close();
    }
  });

  it("a replayed webhook for an already-confirmed payment never double-credits", async () => {
    const mock = await startMockZiniPay({ verify: () => ({ invoice_id: "inv-3", status: "COMPLETED", amount: 25 }) });
    try {
      await enableMockZiniPay(mock.baseUrl);
      const user = await createUser({ balance: 0 });

      await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 25 });

      const { prisma } = await import("../src/lib/prisma.js");
      const deposit = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });

      const first = await request(app).post("/api/payments/zinipay/webhook").send({ invoice_id: deposit.gatewayRef });
      expect(first.status).toBe(200);
      const second = await request(app).post("/api/payments/zinipay/webhook").send({ invoice_id: deposit.gatewayRef });
      expect(second.status).toBe(200);

      const wallet = await getWalletForUser(user.id);
      expect(wallet.balance.toString()).toBe("25"); // credited exactly once despite two webhook deliveries
    } finally {
      await mock.close();
    }
  });

  it("rejects an unknown gateway key", async () => {
    const user = await createUser();
    const res = await request(app)
      .post("/api/payments/not-a-real-gateway/deposits")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .send({ amount: 10 });
    expect(res.status).toBe(404);
  });
});
