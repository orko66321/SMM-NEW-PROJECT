import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { app, createCoupon, createPaymentMethod, createUser, resetDb } from "./helpers.js";
import { createManualDeposit, reviewDeposit } from "../src/services/deposit.service.js";
import { validateCoupon } from "../src/services/coupon.service.js";
import { getWalletForUser } from "../src/services/wallet.service.js";
import { prisma } from "../src/lib/prisma.js";
import request from "supertest";
import jwt from "jsonwebtoken";
import { env } from "../src/env.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

describe("coupon redemption (Phase 4)", () => {
  it("credits a PERCENT coupon bonus atomically with the deposit, as a single CouponRedemption row", async () => {
    const method = await createPaymentMethod();
    const coupon = await createCoupon({ code: "SAVE10", type: "PERCENT", value: 10 });
    const user = await createUser({ balance: 0 });
    const admin = await createUser({ role: "ADMIN" });

    const deposit = await createManualDeposit(user.id, {
      paymentMethodId: method.id,
      amount: 100,
      trxId: "TXN-COUPON-1",
      senderNumber: "01711111111",
      couponCode: "SAVE10",
    });

    const reviewed = await reviewDeposit(deposit.id, admin.id, "APPROVE");
    expect(reviewed.bonusAmount.toString()).toBe("10");

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("110"); // 100 principal + 10% coupon bonus

    const redemptions = await prisma.couponRedemption.findMany({ where: { couponId: coupon.id } });
    expect(redemptions).toHaveLength(1);
    expect(redemptions[0]?.amount.toString()).toBe("10");

    const updatedCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(updatedCoupon.usedCount).toBe(1);
  });

  it("credits a FIXED coupon as a flat amount regardless of deposit size", async () => {
    const method = await createPaymentMethod();
    await createCoupon({ code: "FLAT5", type: "FIXED", value: 5 });
    const user = await createUser({ balance: 0 });
    const admin = await createUser({ role: "ADMIN" });

    const deposit = await createManualDeposit(user.id, {
      paymentMethodId: method.id,
      amount: 200,
      trxId: "TXN-COUPON-2",
      senderNumber: "01711111111",
      couponCode: "FLAT5",
    });
    await reviewDeposit(deposit.id, admin.id, "APPROVE");

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("205");
  });

  it("rejects redeeming the same coupon twice by the same user, at creation time", async () => {
    const method = await createPaymentMethod();
    await createCoupon({ code: "ONCE", type: "FIXED", value: 5 });
    const user = await createUser({ balance: 0 });
    const admin = await createUser({ role: "ADMIN" });

    const first = await createManualDeposit(user.id, {
      paymentMethodId: method.id,
      amount: 50,
      trxId: "TXN-ONCE-1",
      senderNumber: "01711111111",
      couponCode: "ONCE",
    });
    await reviewDeposit(first.id, admin.id, "APPROVE");

    await expect(
      createManualDeposit(user.id, {
        paymentMethodId: method.id,
        amount: 50,
        trxId: "TXN-ONCE-2",
        senderNumber: "01711111111",
        couponCode: "ONCE",
      }),
    ).rejects.toThrow(/already used this coupon/i);
  });

  it("enforces maxUses across different users", async () => {
    await createCoupon({ code: "LIMITED", type: "FIXED", value: 5, maxUses: 1 });
    const userA = await createUser({ balance: 0 });
    const userB = await createUser({ balance: 0 });

    await validateCoupon("LIMITED", userA.id, 50); // still eligible, doesn't mutate usedCount
    await prisma.coupon.update({ where: { code: "LIMITED" }, data: { usedCount: 1 } }); // simulate userA's redemption having landed

    await expect(validateCoupon("LIMITED", userB.id, 50)).rejects.toThrow(/usage limit/i);
  });

  it("still credits the deposit's principal even if the coupon went stale between creation and approval", async () => {
    const method = await createPaymentMethod();
    const coupon = await createCoupon({ code: "GOESSTALE", type: "FIXED", value: 5 });
    const user = await createUser({ balance: 0 });
    const admin = await createUser({ role: "ADMIN" });

    const deposit = await createManualDeposit(user.id, {
      paymentMethodId: method.id,
      amount: 40,
      trxId: "TXN-STALE-1",
      senderNumber: "01711111111",
      couponCode: "GOESSTALE",
    });

    // Coupon deactivated after the deposit was submitted but before approval.
    await prisma.coupon.update({ where: { id: coupon.id }, data: { active: false } });

    const reviewed = await reviewDeposit(deposit.id, admin.id, "APPROVE");
    expect(reviewed.status).toBe("APPROVED");
    expect(reviewed.bonusAmount.toString()).toBe("0"); // bonus silently skipped, not an error

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("40"); // principal still credited
  });

  it("blocks deleting a coupon with redemption history, same as payment methods", async () => {
    const method = await createPaymentMethod();
    const coupon = await createCoupon({ code: "HASHISTORY", type: "FIXED", value: 5 });
    const user = await createUser({ balance: 0 });
    const admin = await createUser({ role: "ADMIN" });

    const deposit = await createManualDeposit(user.id, {
      paymentMethodId: method.id,
      amount: 40,
      trxId: "TXN-HISTORY-1",
      senderNumber: "01711111111",
      couponCode: "HASHISTORY",
    });
    await reviewDeposit(deposit.id, admin.id, "APPROVE");

    const { deleteCoupon } = await import("../src/services/coupon.service.js");
    await expect(deleteCoupon(coupon.id)).rejects.toThrow(/disable it instead/i);
  });

  it("the validate endpoint requires auth and returns the bonus preview", async () => {
    await createCoupon({ code: "PREVIEWME", type: "PERCENT", value: 20 });
    const user = await createUser();

    const unauth = await request(app).post("/api/coupons/validate").send({ code: "PREVIEWME", amount: 100 });
    expect(unauth.status).toBe(401);

    const res = await request(app)
      .post("/api/coupons/validate")
      .set("Authorization", `Bearer ${tokenFor(user.id)}`)
      .send({ code: "PREVIEWME", amount: 100 });
    expect(res.status).toBe(200);
    expect(res.body.bonusAmount).toBe("20");
  });
});
