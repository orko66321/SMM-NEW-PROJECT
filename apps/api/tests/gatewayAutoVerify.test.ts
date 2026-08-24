import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createUser, enableGateway, resetDb } from "./helpers.js";
import { env } from "../src/env.js";
import { startMockZiniPay } from "./mocks/zinipay.js";
import { getWalletForUser } from "../src/services/wallet.service.js";
import { reviewDeposit } from "../src/services/deposit.service.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

describe("PaymentGatewayConfig.autoVerify safety switch (Phase 4)", () => {
  it("when disabled: a verified payment is left PENDING for manual release instead of auto-crediting", async () => {
    const mock = await startMockZiniPay({ invoiceId: "inv-av-1", verify: () => ({ invoice_id: "inv-av-1", status: "COMPLETED", amount: 25 }) });
    try {
      await enableGateway("ZINIPAY", { apiKey: "test-key", baseUrl: mock.baseUrl }, { autoVerify: false });
      const user = await createUser({ balance: 0 });
      const admin = await createUser({ role: "ADMIN" });

      await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 25 });

      const deposit = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });
      const callback = await request(app).get(`/api/payments/zinipay/callback?depositId=${deposit.id}`);
      expect(callback.status).toBe(302);

      // Verified via the gateway's own API, but NOT auto-credited.
      const afterCallback = await prisma.deposit.findUniqueOrThrow({ where: { id: deposit.id } });
      expect(afterCallback.status).toBe("PENDING");
      expect(afterCallback.reviewNote).toMatch(/verified via zinipay api/i);

      const walletBeforeApproval = await getWalletForUser(user.id);
      expect(walletBeforeApproval.balance.toString()).toBe("0");

      // Admin can still one-click approve it from the manual queue.
      await reviewDeposit(deposit.id, admin.id, "APPROVE");
      const walletAfterApproval = await getWalletForUser(user.id);
      expect(walletAfterApproval.balance.toString()).toBe("25");
    } finally {
      await mock.close();
    }
  });

  it("when enabled (default): a verified payment auto-credits exactly as Phase 2/3 always did", async () => {
    const mock = await startMockZiniPay({ invoiceId: "inv-av-2", verify: () => ({ invoice_id: "inv-av-2", status: "COMPLETED", amount: 25 }) });
    try {
      await enableGateway("ZINIPAY", { apiKey: "test-key", baseUrl: mock.baseUrl }); // autoVerify defaults true
      const user = await createUser({ balance: 0 });

      await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 25 });

      const deposit = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });
      await request(app).get(`/api/payments/zinipay/callback?depositId=${deposit.id}`);

      const wallet = await getWalletForUser(user.id);
      expect(wallet.balance.toString()).toBe("25");
    } finally {
      await mock.close();
    }
  });
});
