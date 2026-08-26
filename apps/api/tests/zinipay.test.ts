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
  it("sends the exact request field names ZiniPay's real API expects — invoiceId (camelCase) on verify, cus_name/cus_email on create", async () => {
    // Regression test for a real bug: this adapter used to send
    // `invoice_id` (snake_case) to /v1/payment/verify, which is wrong per
    // a working reference implementation — the real API expects
    // `invoiceId`. A mock that doesn't care what key name it receives
    // wouldn't have caught that; this test inspects the raw request body
    // ZiniPay actually receives.
    const mock = await startMockZiniPay({ invoiceId: "inv-fields", verify: () => ({ status: "PENDING" }) });
    try {
      await enableMockZiniPay(mock.baseUrl);
      const user = await createUser({ balance: 0 });

      await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 25 });

      // amount here is BDT, not the $25 USD requested — ZiniPay is
      // BDT-only, so the adapter converts via SiteSettings.usdToBdtRate
      // before this leaves our server (services/payments/currency.ts).
      const { getUsdToBdtRate } = await import("../src/services/settings.service.js");
      const rate = await getUsdToBdtRate();
      const expectedBdt = Number(rate.mul(25).toFixed(2));
      const createBody = mock.getLastCreateBody();
      expect(createBody).toMatchObject({ cus_name: expect.any(String), cus_email: expect.any(String), amount: expectedBdt });

      const { prisma } = await import("../src/lib/prisma.js");
      const deposit = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });
      await request(app).get(`/api/payments/zinipay/callback?depositId=${deposit.id}`);

      const verifyBody = mock.getLastVerifyBody();
      expect(verifyBody).toEqual({ invoiceId: "inv-fields" });
      expect(verifyBody).not.toHaveProperty("invoice_id");
    } finally {
      await mock.close();
    }
  });

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
