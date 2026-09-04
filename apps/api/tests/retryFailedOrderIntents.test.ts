import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import {
  app,
  createBrand,
  createCategoryAndService,
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
import { createOrderOrRedirect } from "../src/services/order.service.js";
import { retryFailedOrderIntents } from "../src/cron/retryFailedOrderIntents.js";
import { prisma } from "../src/lib/prisma.js";
import { encrypt } from "../src/lib/crypto.js";
import { AppError } from "../src/utils/AppError.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

async function linkStockPool(packageId: string, poolId: string) {
  await prisma.packageStockPool.create({ data: { packageId, poolId } });
}

// This is the concrete gap that produced the "paid via ZiniPay checkout, but
// order stuck needing manual approval" symptom: confirmGatewayDeposit always
// approves the deposit + credits the wallet, but a PACKAGE/SERVICE
// OrderIntent's own placement can genuinely fail at that exact instant
// (stock momentarily out, a passing hiccup) with nothing that ever retried
// it — the money just sat there. retryFailedOrderIntents is the self-heal.
describe("retryFailedOrderIntents — self-heals a paid order that failed to place", () => {
  it("PACKAGE intent: out of stock at confirm time -> FAILED, deposit still APPROVED -> restock -> retry places the order", async () => {
    const mock = await startMockZiniPay({
      invoiceId: "retry-inv-1",
      verify: () => ({ invoice_id: "retry-inv-1", status: "COMPLETED", amount: 20 }),
    });
    try {
      await enableGateway("ZINIPAY", { apiKey: "test-key", baseUrl: mock.baseUrl });
      const method = await createPaymentMethod({ gatewayType: "AUTOMATED", gatewayProvider: "ZINIPAY" });
      const user = await createUser({ balance: 0 });
      const brand = await createBrand();
      const product = await createProduct(brand.id);
      const pkg = await createPackage(product.id, { salePrice: 20 });
      const pool = await createStockPoolWithCodes(["RETRY-CODE-1"]);
      await linkStockPool(pkg.id, pool.id);

      const attempt = await request(app)
        .post("/api/store/purchase")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .set("Idempotency-Key", "retry-key-1")
        .send({ packageId: pkg.id, buyerInput: "buyer@example.com" });
      const { orderIntentId } = attempt.body.details;

      // Someone else claims the only code before payment confirms.
      await prisma.stockCode.updateMany({ where: { poolId: pool.id }, data: { status: "CONSUMED" } });

      const deposit = await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 20, paymentMethodId: method.id, orderIntentId });
      const depositRow = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });

      const callback = await request(app).get(`/api/payments/zinipay/callback?depositId=${depositRow.id}`);
      expect(callback.status).toBe(302);

      // Payment is verified and the wallet IS credited — the order just
      // couldn't be placed at that instant.
      expect((await getWalletForUser(user.id)).balance.toString()).toBe("20");
      const depositAfter = await prisma.deposit.findUniqueOrThrow({ where: { id: depositRow.id } });
      expect(depositAfter.status).toBe("APPROVED");
      const intentAfter = await prisma.orderIntent.findUniqueOrThrow({ where: { id: orderIntentId } });
      expect(intentAfter.status).toBe("FAILED");
      expect(await prisma.order.count({ where: { userId: user.id } })).toBe(0);

      // Nothing to retry onto yet.
      const firstPass = await retryFailedOrderIntents();
      expect(firstPass.checked).toBe(1);
      expect(await prisma.orderIntent.findUniqueOrThrow({ where: { id: orderIntentId } }).then((i) => i.status)).toBe("FAILED");

      // Admin restocks — the next tick should self-heal.
      await prisma.stockCode.create({ data: { poolId: pool.id, codeCiphertext: encrypt("RETRY-CODE-2") } });
      const secondPass = await retryFailedOrderIntents();
      expect(secondPass.retried).toBe(1);

      const intentFinal = await prisma.orderIntent.findUniqueOrThrow({ where: { id: orderIntentId } });
      expect(intentFinal.status).toBe("FULFILLED");
      const order = await prisma.order.findUniqueOrThrow({ where: { id: intentFinal.orderId! } });
      expect(order.status).toBe("COMPLETED");
      expect(order.charge.toString()).toBe("20");
      // Debited exactly once — the $20 credit from the deposit funded it, no re-charge.
      expect((await getWalletForUser(user.id)).balance.toString()).toBe("0");
      void deposit;
    } finally {
      await mock.close();
    }
  });

  it("does not retry an expired intent, and does not retry a FAILED intent with no approved deposit", async () => {
    const user = await createUser({ balance: 100 });
    const brand = await createBrand();
    const product = await createProduct(brand.id);
    const pkg = await createPackage(product.id, { salePrice: 10 });

    const expired = await prisma.orderIntent.create({
      data: {
        userId: user.id,
        kind: "PACKAGE",
        packageId: pkg.id,
        link: "buyer@example.com",
        quantity: 1,
        charge: 10,
        idempotencyKey: "expired-1",
        status: "FAILED",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const deposit = await prisma.deposit.create({
      data: { userId: user.id, method: "ZINIPAY", amount: 10, status: "APPROVED", orderIntentId: expired.id, gatewayRef: "expired-ref" },
    });

    const neverPaid = await prisma.orderIntent.create({
      data: {
        userId: user.id,
        kind: "PACKAGE",
        packageId: pkg.id,
        link: "buyer@example.com",
        quantity: 1,
        charge: 10,
        idempotencyKey: "never-paid-1",
        status: "FAILED",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const result = await retryFailedOrderIntents();
    expect(result.checked).toBe(0); // neither the expired-but-paid nor the unpaid one qualifies
    expect((await prisma.orderIntent.findUniqueOrThrow({ where: { id: expired.id } })).status).toBe("FAILED");
    expect((await prisma.orderIntent.findUniqueOrThrow({ where: { id: neverPaid.id } })).status).toBe("FAILED");
    void deposit;
  });

  it("SERVICE intent: same self-heal path via New Order", async () => {
    const mock = await startMockZiniPay({
      invoiceId: "retry-inv-2",
      verify: () => ({ invoiceId: "retry-inv-2", status: "COMPLETED", amount: 10 }),
    });
    try {
      await enableGateway("ZINIPAY", { apiKey: "test-key", baseUrl: mock.baseUrl });
      const method = await createPaymentMethod({ gatewayType: "AUTOMATED", gatewayProvider: "ZINIPAY" });
      const user = await createUser({ balance: 0 });
      const { service } = await createCategoryAndService({ sellPricePer1000: 10 });

      const thrown: unknown = await createOrderOrRedirect(
        user.id,
        { serviceId: service.id, link: "https://instagram.com/someone", quantity: 1000 },
        "retry-service-key-1",
      ).catch((err: unknown) => err);
      expect(thrown).toBeInstanceOf(AppError);
      const details = (thrown as AppError).details as { orderIntentId: string };
      const orderIntentId = details.orderIntentId;

      const deposit = await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 10, paymentMethodId: method.id, orderIntentId });
      const depositRow = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });

      // Service goes inactive right before confirm -> placement fails.
      await prisma.service.update({ where: { id: service.id }, data: { status: "DISABLED" } });
      await request(app).get(`/api/payments/zinipay/callback?depositId=${depositRow.id}`);
      expect((await prisma.orderIntent.findUniqueOrThrow({ where: { id: orderIntentId } })).status).toBe("FAILED");
      expect((await getWalletForUser(user.id)).balance.toString()).toBe("10");

      // Re-enable the service; the cron should place the order.
      await prisma.service.update({ where: { id: service.id }, data: { status: "ACTIVE" } });
      const retryResult = await retryFailedOrderIntents();
      expect(retryResult.retried).toBe(1);

      const intentFinal = await prisma.orderIntent.findUniqueOrThrow({ where: { id: orderIntentId } });
      expect(intentFinal.status).toBe("FULFILLED");
      expect((await getWalletForUser(user.id)).balance.toString()).toBe("0");
      void deposit;
    } finally {
      await mock.close();
    }
  });
});
