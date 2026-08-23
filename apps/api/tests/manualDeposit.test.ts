import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, createPaymentMethod, createUser, resetDb } from "./helpers.js";
import { env } from "../src/env.js";
import { createManualDeposit, reviewDeposit } from "../src/services/deposit.service.js";
import { getWalletForUser } from "../src/services/wallet.service.js";
import { prisma } from "../src/lib/prisma.js";

beforeEach(resetDb);
afterEach(resetDb);

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

describe("manual deposit queue (Phase 3)", () => {
  it("rejects a duplicate TrxID via the API with a clear 409", async () => {
    const method = await createPaymentMethod({ title: "bKash Personal #1" });
    const user = await createUser();
    const token = tokenFor(user.id);
    const payload = { paymentMethodId: method.id, amount: 10, trxId: "TXN-DUP-1", senderNumber: "01711111111" };

    const first = await request(app).post("/api/wallet/deposits").set("Authorization", `Bearer ${token}`).send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/wallet/deposits").set("Authorization", `Bearer ${token}`).send(payload);
    expect(second.status).toBe(409);
  });

  it("prevents duplicate TrxID even bypassing the pre-check (DB unique constraint is the real guard)", async () => {
    const method = await createPaymentMethod({ title: "bKash Personal #1" });
    const userA = await createUser();
    const userB = await createUser();

    await createManualDeposit(userA.id, { paymentMethodId: method.id, amount: 10, trxId: "TXN-RACE-1", senderNumber: "01711111111" });

    // A second user submitting the exact same real-world transaction ID
    // (e.g. reusing someone else's screenshot) must be rejected too.
    await expect(
      createManualDeposit(userB.id, { paymentMethodId: method.id, amount: 10, trxId: "TXN-RACE-1", senderNumber: "01722222222" }),
    ).rejects.toThrow(/already been submitted/i);
  });

  it("rejects an amount outside the method's min/max", async () => {
    const method = await createPaymentMethod({ minAmount: 5, maxAmount: 50 });
    const user = await createUser();
    await expect(
      createManualDeposit(user.id, { paymentMethodId: method.id, amount: 500, trxId: "TXN-TOO-BIG", senderNumber: "01711111111" }),
    ).rejects.toThrow(/between/i);
  });

  it("credits principal + bonus as separate ledger rows when the method has a bonusPercent", async () => {
    const method = await createPaymentMethod({ title: "Nagad Agent", bonusPercent: 5 });
    const user = await createUser({ balance: 0 });
    const admin = await createUser({ role: "ADMIN" });

    const deposit = await createManualDeposit(user.id, {
      paymentMethodId: method.id,
      amount: 100,
      trxId: "TXN-BONUS-1",
      senderNumber: "01711111111",
    });

    const reviewed = await reviewDeposit(deposit.id, admin.id, "APPROVE");
    // The returned row (what the API response is built from) must reflect
    // the bonus too, not just what's in the DB afterward — bonusAmount is
    // written inside the same transaction as the status flip.
    expect(reviewed.bonusAmount.toString()).toBe("5");

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("105"); // 100 principal + 5% bonus

    const txs = await prisma.walletTransaction.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: "asc" } });
    expect(txs.map((t) => t.type)).toEqual(["DEPOSIT", "DEPOSIT_BONUS"]);
    expect(txs[0]?.amount.toString()).toBe("100");
    expect(txs[1]?.amount.toString()).toBe("5");

    const updatedDeposit = await prisma.deposit.findUniqueOrThrow({ where: { id: deposit.id } });
    expect(updatedDeposit.bonusAmount.toString()).toBe("5");
  });

  it("credits only the principal when bonusPercent is zero", async () => {
    const method = await createPaymentMethod({ bonusPercent: 0 });
    const user = await createUser({ balance: 0 });
    const admin = await createUser({ role: "ADMIN" });

    const deposit = await createManualDeposit(user.id, { paymentMethodId: method.id, amount: 40, trxId: "TXN-NOBONUS-1", senderNumber: "01711111111" });
    await reviewDeposit(deposit.id, admin.id, "APPROVE");

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("40");
  });

  it("rejecting a deposit never credits the wallet", async () => {
    const method = await createPaymentMethod({ bonusPercent: 10 });
    const user = await createUser({ balance: 0 });
    const admin = await createUser({ role: "ADMIN" });

    const deposit = await createManualDeposit(user.id, { paymentMethodId: method.id, amount: 40, trxId: "TXN-REJECT-1", senderNumber: "01711111111" });
    await reviewDeposit(deposit.id, admin.id, "REJECT", "Screenshot did not match");

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("0");
  });
});
