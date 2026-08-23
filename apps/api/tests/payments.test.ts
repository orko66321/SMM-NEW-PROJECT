import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createUser, resetDb } from "./helpers.js";
import { env } from "../src/env.js";
import { startMockBkash } from "./mocks/bkash.js";
import { upsertGatewayConfig } from "../src/services/payments/config.service.js";
import { getWalletForUser } from "../src/services/wallet.service.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

async function enableMockBkash(baseUrl: string) {
  await upsertGatewayConfig("BKASH", {
    mode: "SANDBOX",
    enabled: true,
    credentials: { appKey: "k", appSecret: "s", username: "u", password: "p", baseUrl },
  });
}

describe("payment gateway callback trust boundary", () => {
  it("does not credit the wallet from query params alone — only a server-verified PAID confirm credits", async () => {
    const mock = await startMockBkash({
      execute: () => ({ statusCode: "0000", statusMessage: "Failed", paymentID: "pay-1", transactionStatus: "Failed" }),
    });
    try {
      await enableMockBkash(mock.baseUrl);
      const user = await createUser({ balance: 0 });

      const initiate = await request(app)
        .post("/api/payments/bkash/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 25 });
      expect(initiate.status).toBe(201);

      // Attacker/user hits the callback with a fabricated success-looking query string.
      const callback = await request(app).get(`/api/payments/bkash/callback?paymentID=${mock.paymentID}&status=success`);
      expect(callback.status).toBe(302);
      expect(callback.headers.location).toContain("deposit=failed");

      const wallet = await getWalletForUser(user.id);
      expect(wallet.balance.toString()).toBe("0"); // never credited, because our own confirm() call reported Failed
    } finally {
      await mock.close();
    }
  });

  it("credits the wallet exactly once even if the callback is hit twice for the same payment", async () => {
    const mock = await startMockBkash({
      execute: () => ({ statusCode: "0000", statusMessage: "Successful", paymentID: "pay-2", transactionStatus: "Completed", amount: "25.00" }),
    });
    try {
      await enableMockBkash(mock.baseUrl);
      const user = await createUser({ balance: 0 });

      await request(app)
        .post("/api/payments/bkash/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 25 });

      const first = await request(app).get(`/api/payments/bkash/callback?paymentID=${mock.paymentID}`);
      expect(first.status).toBe(302);
      expect(first.headers.location).toContain("deposit=success");

      const afterFirst = await getWalletForUser(user.id);
      expect(afterFirst.balance.toString()).toBe("25");

      const second = await request(app).get(`/api/payments/bkash/callback?paymentID=${mock.paymentID}`);
      expect(second.status).toBe(302);

      const afterSecond = await getWalletForUser(user.id);
      expect(afterSecond.balance.toString()).toBe("25"); // not double-credited
    } finally {
      await mock.close();
    }
  });

  it("rejects deposits to a disabled/unconfigured gateway", async () => {
    const user = await createUser({ balance: 0 });
    const res = await request(app)
      .post("/api/payments/bkash/deposits")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .send({ amount: 25 });
    expect(res.status).toBe(400);
  });

  it("requires authentication to initiate a gateway deposit", async () => {
    const res = await request(app).post("/api/payments/bkash/deposits").send({ amount: 25 });
    expect(res.status).toBe(401);
  });
});
