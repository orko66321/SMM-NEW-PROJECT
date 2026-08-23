import { Prisma, type WalletTxType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";

export interface AdjustWalletParams {
  userId: string;
  /** Positive = credit, negative = debit. */
  amount: Prisma.Decimal.Value;
  type: WalletTxType;
  referenceType?: string;
  referenceId?: string;
  note?: string;
}

/**
 * The single choke point for every wallet balance mutation in the system.
 *
 * Must be called with a `tx` obtained from `prisma.$transaction(async (tx) => ...)`
 * so that the row lock below and the ledger write are atomic with whatever
 * else the caller does in the same transaction (e.g. creating the Order row).
 *
 * Race-condition protection: `SELECT ... FOR UPDATE` takes a row-level lock
 * on the wallet, so if two requests try to debit the same wallet at the same
 * instant, the second one blocks until the first commits and only then reads
 * the *post-debit* balance — making "spend the same dollar twice" structurally
 * impossible rather than merely unlikely.
 */
export async function adjustWalletBalance(
  tx: Prisma.TransactionClient,
  params: AdjustWalletParams,
): Promise<{ walletId: string; balanceAfter: Prisma.Decimal }> {
  const amount = new Prisma.Decimal(params.amount);
  if (amount.isZero()) {
    throw AppError.badRequest("Wallet adjustment amount cannot be zero");
  }

  const locked = await tx.$queryRaw<{ id: string; balance: Prisma.Decimal }[]>`
    SELECT "id", "balance" FROM "Wallet" WHERE "userId" = ${params.userId} FOR UPDATE
  `;
  const wallet = locked[0];
  if (!wallet) {
    throw AppError.notFound("Wallet not found");
  }

  const newBalance = new Prisma.Decimal(wallet.balance).plus(amount);
  if (newBalance.isNegative()) {
    throw AppError.badRequest("Insufficient wallet balance");
  }

  await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: newBalance },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: params.type,
      amount,
      balanceAfter: newBalance,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      note: params.note,
    },
  });

  return { walletId: wallet.id, balanceAfter: newBalance };
}

/** Convenience wrapper for a standalone credit (e.g. admin adjustment, approved deposit). */
export async function creditWallet(params: Omit<AdjustWalletParams, "amount"> & { amount: Prisma.Decimal.Value }) {
  const amount = new Prisma.Decimal(params.amount);
  if (amount.isNegative()) throw AppError.badRequest("Credit amount must be positive");
  return prisma.$transaction((tx) => adjustWalletBalance(tx, { ...params, amount }));
}

/** Convenience wrapper for a standalone debit (e.g. admin correction). Amount is given as a positive number. */
export async function debitWallet(params: Omit<AdjustWalletParams, "amount"> & { amount: Prisma.Decimal.Value }) {
  const amount = new Prisma.Decimal(params.amount);
  if (amount.isNegative()) throw AppError.badRequest("Debit amount must be positive");
  return prisma.$transaction((tx) => adjustWalletBalance(tx, { ...params, amount: amount.negated() }));
}

export async function getWalletForUser(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw AppError.notFound("Wallet not found");
  return wallet;
}

export async function listWalletTransactions(userId: string, page: number, pageSize: number) {
  const wallet = await getWalletForUser(userId);
  const [items, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
  ]);
  return { items, total, page, pageSize };
}
