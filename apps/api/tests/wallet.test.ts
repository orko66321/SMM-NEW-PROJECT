import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createUser, resetDb } from "./helpers.js";
import { creditWallet, debitWallet, getWalletForUser } from "../src/services/wallet.service.js";

beforeEach(resetDb);
afterEach(resetDb);

describe("wallet — money safety", () => {
  it("never allows balance to go negative", async () => {
    const user = await createUser({ balance: 50 });
    await expect(debitWallet({ userId: user.id, amount: 100, type: "ORDER_DEBIT" })).rejects.toThrow(
      /insufficient/i,
    );
    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("50");
  });

  it("race-condition protection: N concurrent debits against a fixed balance only let the affordable count through", async () => {
    const user = await createUser({ balance: 100 });

    // 20 concurrent requests to debit $10 each against a $100 balance —
    // exactly 10 must succeed and 10 must fail, and the final balance must
    // land at exactly $0, never negative and never double-spent.
    const attempts = Array.from({ length: 20 }, () =>
      debitWallet({ userId: user.id, amount: 10, type: "ORDER_DEBIT" }).then(
        () => "ok" as const,
        () => "fail" as const,
      ),
    );
    const results = await Promise.all(attempts);

    const succeeded = results.filter((r) => r === "ok").length;
    const failed = results.filter((r) => r === "fail").length;

    expect(succeeded).toBe(10);
    expect(failed).toBe(10);

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("0");
  });

  it("credit followed by debit reconciles to the expected balance with a full ledger trail", async () => {
    const user = await createUser({ balance: 0 });
    await creditWallet({ userId: user.id, amount: 30, type: "DEPOSIT" });
    await debitWallet({ userId: user.id, amount: 12, type: "ORDER_DEBIT" });

    const wallet = await getWalletForUser(user.id);
    expect(wallet.balance.toString()).toBe("18");
  });

  it("rejects a zero-amount adjustment", async () => {
    const user = await createUser({ balance: 10 });
    await expect(creditWallet({ userId: user.id, amount: 0, type: "DEPOSIT" })).rejects.toThrow();
  });
});
