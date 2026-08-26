import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createUser, resetDb } from "./helpers.js";
import { env } from "../src/env.js";
import { prisma } from "../src/lib/prisma.js";
import { startMockZiniPay } from "./mocks/zinipay.js";
import { startMockBkash } from "./mocks/bkash.js";
import { upsertGatewayConfig } from "../src/services/payments/config.service.js";
import { getWalletForUser } from "../src/services/wallet.service.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

// A rate that isn't SiteSettings' own default (110) — makes the math
// assertions below meaningful rather than coincidentally matching whatever
// the schema default happens to be.
async function setRate(rate: number) {
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: { usdToBdtRate: rate },
    create: { id: "default", usdToBdtRate: rate },
  });
}

// Real bug: ZiniPay and bKash are both BDT-only gateways, but the amount
// they were sent was the raw USD figure with no rate multiplication at all —
// a $0.20 charge went out as "0.20" (a fraction of a poisha) instead of
// "26.00" (0.20 * 130). These tests inspect the actual outbound gateway
// request body, not just the response our own routes return.
describe("USD -> BDT conversion at the gateway boundary", () => {
  it("ZiniPay: create request amount is USD * rate, stored as an audit trail, wallet still credited in USD", async () => {
    await setRate(125);
    const mock = await startMockZiniPay({ invoiceId: "curr-1", verify: () => ({ invoiceId: "curr-1", status: "COMPLETED" }) });
    try {
      await upsertGatewayConfig("ZINIPAY", { mode: "SANDBOX", enabled: true, credentials: { apiKey: "k", baseUrl: mock.baseUrl } });
      const user = await createUser({ balance: 0 });

      const initiate = await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 10 }); // $10 USD
      expect(initiate.status).toBe(201);

      const createBody = mock.getLastCreateBody();
      expect(createBody?.amount).toBe(1250); // 10 * 125, not 10

      const deposit = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });
      expect(deposit.amount.toString()).toBe("10"); // USD, unconverted — this is what credits the wallet
      expect(deposit.gatewayAmount?.toString()).toBe("1250"); // BDT audit trail
      expect(deposit.gatewayCurrency).toBe("BDT");

      await request(app).get(`/api/payments/zinipay/callback?depositId=${deposit.id}`);
      const wallet = await getWalletForUser(user.id);
      expect(wallet.balance.toString()).toBe("10"); // credited $10, never 1250
    } finally {
      await mock.close();
    }
  });

  it("bKash: create request amount (a string) is USD * rate, not the raw USD figure just .toFixed(2)'d", async () => {
    await setRate(125);
    const mock = await startMockBkash({});
    try {
      await upsertGatewayConfig("BKASH", {
        mode: "SANDBOX",
        enabled: true,
        credentials: { appKey: "k", appSecret: "s", username: "u", password: "p", baseUrl: mock.baseUrl },
      });
      const user = await createUser({ balance: 0 });

      const initiate = await request(app)
        .post("/api/payments/bkash/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 10 }); // $10 USD
      expect(initiate.status).toBe(201);

      const createBody = mock.getLastCreateBody();
      expect(createBody?.amount).toBe("1250.00"); // 10 * 125, not "10.00"
      expect(createBody?.currency).toBe("BDT");

      const deposit = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });
      expect(deposit.gatewayAmount?.toString()).toBe("1250");
      expect(deposit.gatewayCurrency).toBe("BDT");
    } finally {
      await mock.close();
    }
  });

  it("a gateway-reported paid amount that doesn't match what we expected never changes what gets credited", async () => {
    await setRate(125);
    // Mock's verify claims a wildly different "paid" figure than the
    // 1250 BDT we actually asked ZiniPay to charge — simulating a
    // mismatched/garbled gateway response. Should log a warning
    // (services/deposit.service.ts) and still credit exactly deposit.amount.
    const mock = await startMockZiniPay({ invoiceId: "curr-3", verify: () => ({ invoiceId: "curr-3", status: "COMPLETED", amount: 999_999 }) });
    try {
      await upsertGatewayConfig("ZINIPAY", { mode: "SANDBOX", enabled: true, credentials: { apiKey: "k", baseUrl: mock.baseUrl } });
      const user = await createUser({ balance: 0 });

      await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 10 });

      const deposit = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });
      await request(app).get(`/api/payments/zinipay/callback?depositId=${deposit.id}`);

      const wallet = await getWalletForUser(user.id);
      expect(wallet.balance.toString()).toBe("10"); // still exactly $10 — 999999 never touched crediting
    } finally {
      await mock.close();
    }
  });
});
