import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createUser, resetDb } from "./helpers.js";
import { env } from "../src/env.js";
import { registerUser } from "../src/services/auth.service.js";
import { reviewDeposit } from "../src/services/deposit.service.js";
import { getWalletForUser } from "../src/services/wallet.service.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(id: string) {
  return jwt.sign({ sub: id }, env.JWT_SECRET, { expiresIn: "15m" });
}

async function setReferral(v: Partial<{ enabled: boolean; type: "PERCENTAGE" | "FIXED"; value: number; refereeBonus: number }>) {
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {
      referralSystemEnabled: v.enabled ?? false,
      referrerRewardType: v.type ?? "PERCENTAGE",
      referrerRewardValue: v.value ?? 0,
      refereeBonusPercent: v.refereeBonus ?? 0,
    },
    create: {
      id: "default",
      referralSystemEnabled: v.enabled ?? false,
      referrerRewardType: v.type ?? "PERCENTAGE",
      referrerRewardValue: v.value ?? 0,
      refereeBonusPercent: v.refereeBonus ?? 0,
    },
  });
}

async function approveDeposit(userId: string, adminId: string, amount: number) {
  const d = await prisma.deposit.create({ data: { userId, method: "Manual", amount, status: "PENDING" } });
  return reviewDeposit(d.id, adminId, "APPROVE");
}

describe("referral — registration & tracking", () => {
  it("every new user gets a unique referral code; registering with a valid code sets referredById (case-insensitive)", async () => {
    const referrer = await registerUser({ username: "alice_ref", email: "alice@t.local", password: "Passw0rd!!" });
    expect(referrer.referralCode).toMatch(/^[A-Z2-9]{8}$/);

    const referee = await registerUser({
      username: "bob_ref",
      email: "bob@t.local",
      password: "Passw0rd!!",
      referralCode: referrer.referralCode.toLowerCase(),
    });
    const row = await prisma.user.findUniqueOrThrow({ where: { id: referee.id } });
    expect(row.referredById).toBe(referrer.id);
  });

  it("an unknown referral code is silently ignored", async () => {
    const u = await registerUser({ username: "carol_ref", email: "carol@t.local", password: "Passw0rd!!", referralCode: "NOPENOPE" });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).referredById).toBeNull();
  });
});

describe("referral — first-deposit rewards", () => {
  it("PERCENTAGE: pays the referrer a % of the deposit + gives the referee a bonus, logs it, updates totalReferralEarnings", async () => {
    await setReferral({ enabled: true, type: "PERCENTAGE", value: 5, refereeBonus: 10 });
    const admin = await createUser({ role: "ADMIN" });
    const referrer = await createUser({ balance: 0 });
    const referee = await createUser({ balance: 0, referredById: referrer.id });

    await approveDeposit(referee.id, admin.id, 100);

    // referee: 100 + 10% referral bonus = 110
    expect((await getWalletForUser(referee.id)).balance.toString()).toBe("110");
    // referrer: 5% of 100 = 5
    expect((await getWalletForUser(referrer.id)).balance.toString()).toBe("5");

    const referrerRow = await prisma.user.findUniqueOrThrow({ where: { id: referrer.id } });
    expect(referrerRow.totalReferralEarnings.toString()).toBe("5");

    const log = await prisma.referralLog.findUniqueOrThrow({ where: { refereeId: referee.id } });
    expect(log.referrerId).toBe(referrer.id);
    expect(log.rewardAmount.toString()).toBe("5");
    expect(log.refereeBonusAmount.toString()).toBe("10");
    expect(log.refereeDepositAmount.toString()).toBe("100");
    expect(log.status).toBe("COMPLETED");

    const rewardTx = await prisma.walletTransaction.findFirst({ where: { type: "REFERRAL_REWARD" } });
    expect(rewardTx?.note).toMatch(/Referral reward/);
  });

  it("FIXED: pays the referrer a flat amount regardless of deposit size", async () => {
    await setReferral({ enabled: true, type: "FIXED", value: 20, refereeBonus: 0 });
    const admin = await createUser({ role: "ADMIN" });
    const referrer = await createUser({ balance: 0 });
    const referee = await createUser({ balance: 0, referredById: referrer.id });

    await approveDeposit(referee.id, admin.id, 500);
    expect((await getWalletForUser(referrer.id)).balance.toString()).toBe("20");
    expect((await getWalletForUser(referee.id)).balance.toString()).toBe("500"); // no referee bonus configured
  });

  it("only the referee's FIRST deposit triggers a reward", async () => {
    await setReferral({ enabled: true, type: "FIXED", value: 20 });
    const admin = await createUser({ role: "ADMIN" });
    const referrer = await createUser({ balance: 0 });
    const referee = await createUser({ balance: 0, referredById: referrer.id });

    await approveDeposit(referee.id, admin.id, 100);
    await approveDeposit(referee.id, admin.id, 100);
    expect((await getWalletForUser(referrer.id)).balance.toString()).toBe("20"); // once
    expect(await prisma.referralLog.count()).toBe(1);
  });

  it("nothing happens when the referral system is disabled", async () => {
    await setReferral({ enabled: false, type: "FIXED", value: 20, refereeBonus: 10 });
    const admin = await createUser({ role: "ADMIN" });
    const referrer = await createUser({ balance: 0 });
    const referee = await createUser({ balance: 0, referredById: referrer.id });

    await approveDeposit(referee.id, admin.id, 100);
    expect((await getWalletForUser(referrer.id)).balance.toString()).toBe("0");
    expect((await getWalletForUser(referee.id)).balance.toString()).toBe("100");
    expect(await prisma.referralLog.count()).toBe(0);
  });

  it("a non-referred user's first deposit does nothing referral-related", async () => {
    await setReferral({ enabled: true, type: "FIXED", value: 20 });
    const admin = await createUser({ role: "ADMIN" });
    const user = await createUser({ balance: 0 });
    await approveDeposit(user.id, admin.id, 100);
    expect(await prisma.referralLog.count()).toBe(0);
  });
});

describe("referral — dashboard + admin analytics", () => {
  it("GET /api/referral/me returns the code, counts, earnings and history", async () => {
    await setReferral({ enabled: true, type: "FIXED", value: 15 });
    const admin = await createUser({ role: "ADMIN" });
    const referrer = await createUser({ balance: 0 });
    const r1 = await createUser({ balance: 0, referredById: referrer.id });
    await createUser({ balance: 0, referredById: referrer.id }); // invited, no deposit yet
    await approveDeposit(r1.id, admin.id, 100);

    const res = await request(app).get("/api/referral/me").set("Authorization", `Bearer ${tokenFor(referrer.id)}`);
    expect(res.status).toBe(200);
    expect(res.body.referralCode).toBe((await prisma.user.findUniqueOrThrow({ where: { id: referrer.id } })).referralCode);
    expect(res.body.invitedCount).toBe(2);
    expect(res.body.totalEarnings).toBe("15");
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0].rewardAmount).toBe("15");
  });

  it("GET /api/admin/referral/analytics aggregates payouts and the top-referrer leaderboard (admin only)", async () => {
    await setReferral({ enabled: true, type: "FIXED", value: 10 });
    const admin = await createUser({ role: "ADMIN" });
    const user = await createUser();
    const referrer = await createUser({ balance: 0 });
    const referee = await createUser({ balance: 0, referredById: referrer.id });
    await approveDeposit(referee.id, admin.id, 100);

    const forbidden = await request(app).get("/api/admin/referral/analytics").set("Authorization", `Bearer ${tokenFor(user.id)}`);
    expect(forbidden.status).toBe(403);

    const res = await request(app).get("/api/admin/referral/analytics").set("Authorization", `Bearer ${tokenFor(admin.id)}`);
    expect(res.status).toBe(200);
    expect(res.body.totalReferrals).toBe(1);
    expect(res.body.totalReferrerPayouts).toBe("10");
    expect(res.body.topReferrers[0]).toMatchObject({ referrals: 1, earnings: "10" });
  });
});
