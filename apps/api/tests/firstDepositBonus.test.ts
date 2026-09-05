import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { app, createPaymentMethod, createUser, enableGateway, resetDb } from "./helpers.js";
import { startMockZiniPay } from "./mocks/zinipay.js";
import { reviewDeposit } from "../src/services/deposit.service.js";
import { getWalletForUser } from "../src/services/wallet.service.js";
import { prisma } from "../src/lib/prisma.js";
import request from "supertest";
import jwt from "jsonwebtoken";
import { env } from "../src/env.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(id: string) {
  return jwt.sign({ sub: id }, env.JWT_SECRET, { expiresIn: "15m" });
}

async function setBonus(v: Partial<{ enabled: boolean; percent: number; min: number; max: number }>) {
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {
      firstDepositBonusEnabled: v.enabled ?? false,
      firstDepositBonusPercent: v.percent ?? 0,
      firstDepositMinAmount: v.min ?? 0,
      firstDepositMaxBonus: v.max ?? 0,
    },
    create: {
      id: "default",
      firstDepositBonusEnabled: v.enabled ?? false,
      firstDepositBonusPercent: v.percent ?? 0,
      firstDepositMinAmount: v.min ?? 0,
      firstDepositMaxBonus: v.max ?? 0,
    },
  });
}

/** A PENDING manual deposit, then the admin approves it — same creditApprovedDeposit path as a gateway confirm. */
async function approvedManualDeposit(userId: string, adminId: string, amount: number) {
  const deposit = await prisma.deposit.create({ data: { userId, method: "Manual", amount, status: "PENDING" } });
  return reviewDeposit(deposit.id, adminId, "APPROVE");
}

describe("first-deposit bonus", () => {
  it("credits amount + capped percentage bonus on the first eligible deposit, and sets hasDeposited", async () => {
    await setBonus({ enabled: true, percent: 10, min: 50, max: 100 });
    const admin = await createUser({ role: "ADMIN" });
    const user = await createUser({ balance: 0 });

    const deposit = await approvedManualDeposit(user.id, admin.id, 200);

    // 200 + 10% (20, under the 100 cap) = 220
    expect((await getWalletForUser(user.id)).balance.toString()).toBe("220");
    expect(deposit.bonusAmount.toString()).toBe("20");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).hasDeposited).toBe(true);

    const bonusRows = await prisma.walletTransaction.findMany({ where: { type: "DEPOSIT_BONUS" } });
    expect(bonusRows).toHaveLength(1);
    expect(bonusRows[0]!.note).toMatch(/First-deposit bonus/);
  });

  it("caps the bonus at firstDepositMaxBonus", async () => {
    await setBonus({ enabled: true, percent: 50, min: 0, max: 30 });
    const admin = await createUser({ role: "ADMIN" });
    const user = await createUser({ balance: 0 });

    await approvedManualDeposit(user.id, admin.id, 200); // 50% = 100, capped to 30
    expect((await getWalletForUser(user.id)).balance.toString()).toBe("230");
  });

  it("no bonus when the deposit is below the minimum, but hasDeposited is still consumed", async () => {
    await setBonus({ enabled: true, percent: 10, min: 100 });
    const admin = await createUser({ role: "ADMIN" });
    const user = await createUser({ balance: 0 });

    await approvedManualDeposit(user.id, admin.id, 50);
    expect((await getWalletForUser(user.id)).balance.toString()).toBe("50");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).hasDeposited).toBe(true);
  });

  it("no bonus when the feature is disabled", async () => {
    await setBonus({ enabled: false, percent: 10, min: 0 });
    const admin = await createUser({ role: "ADMIN" });
    const user = await createUser({ balance: 0 });
    await approvedManualDeposit(user.id, admin.id, 100);
    expect((await getWalletForUser(user.id)).balance.toString()).toBe("100");
  });

  it("only the FIRST deposit gets the bonus", async () => {
    await setBonus({ enabled: true, percent: 10, min: 0 });
    const admin = await createUser({ role: "ADMIN" });
    const user = await createUser({ balance: 0 });

    await approvedManualDeposit(user.id, admin.id, 100); // 100 + 10 = 110
    await approvedManualDeposit(user.id, admin.id, 100); // no bonus -> 210
    expect((await getWalletForUser(user.id)).balance.toString()).toBe("210");
    expect(await prisma.walletTransaction.count({ where: { type: "DEPOSIT_BONUS" } })).toBe(1);
  });

  it("also applies on a gateway-confirmed first deposit", async () => {
    const mock = await startMockZiniPay({ invoiceId: "fdb-1", verify: () => ({ invoice_id: "fdb-1", status: "COMPLETED", amount: 25 }) });
    try {
      await setBonus({ enabled: true, percent: 20, min: 0 });
      await enableGateway("ZINIPAY", { apiKey: "k", baseUrl: mock.baseUrl });
      const method = await createPaymentMethod({ gatewayType: "AUTOMATED", gatewayProvider: "ZINIPAY" });
      const user = await createUser({ balance: 0 });

      await request(app)
        .post("/api/payments/zinipay/deposits")
        .set("Authorization", `Bearer ${tokenFor(user.id)}`)
        .send({ amount: 100, paymentMethodId: method.id });
      const deposit = await prisma.deposit.findFirstOrThrow({ where: { userId: user.id } });
      await request(app).get(`/api/payments/zinipay/callback?depositId=${deposit.id}`);

      // 100 + 20% = 120
      expect((await getWalletForUser(user.id)).balance.toString()).toBe("120");
      expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).hasDeposited).toBe(true);
    } finally {
      await mock.close();
    }
  });

  it("stacks on top of a payment-method bonus", async () => {
    await setBonus({ enabled: true, percent: 10, min: 0 });
    const admin = await createUser({ role: "ADMIN" });
    const user = await createUser({ balance: 0 });
    const method = await createPaymentMethod({ gatewayType: "MANUAL", bonusPercent: 5 });

    const deposit = await prisma.deposit.create({
      data: { userId: user.id, method: "M", amount: 100, status: "PENDING", paymentMethodId: method.id },
    });
    await reviewDeposit(deposit.id, admin.id, "APPROVE");

    // 100 + 5% method + 10% first-deposit = 115
    expect((await getWalletForUser(user.id)).balance.toString()).toBe("115");
  });
});
