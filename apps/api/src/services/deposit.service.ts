import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { adjustWalletBalance } from "./wallet.service.js";
import type { CreateDepositInput } from "@smm/shared";

export async function createDeposit(userId: string, input: CreateDepositInput) {
  return prisma.deposit.create({
    data: { userId, method: input.method, amount: input.amount, reference: input.reference },
  });
}

/** Row-locks a Deposit within an existing transaction — see wallet.service.ts's adjustWalletBalance for the same pattern applied to wallets. */
async function lockDeposit(tx: Prisma.TransactionClient, depositId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Deposit" WHERE "id" = ${depositId} FOR UPDATE`;
  return rows[0];
}

export async function createGatewayDeposit(params: {
  userId: string;
  amount: Prisma.Decimal.Value;
  gatewayProvider: string;
  gatewayRef: string;
}) {
  return prisma.deposit.create({
    data: {
      userId: params.userId,
      method: params.gatewayProvider,
      amount: params.amount,
      status: "PENDING",
      gatewayProvider: params.gatewayProvider,
      gatewayRef: params.gatewayRef,
    },
  });
}

export async function listDepositsForUser(userId: string, page: number, pageSize: number) {
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.deposit.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.deposit.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function listDepositsForAdmin(page: number, pageSize: number, status?: string) {
  const where = status ? { status: status as never } : {};
  const [items, total] = await Promise.all([
    prisma.deposit.findMany({
      where,
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.deposit.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

/**
 * Approving a deposit credits the user's wallet atomically with the status
 * flip, inside one transaction — a deposit can never end up "approved" in
 * the ledger without the wallet actually being credited, or vice versa.
 */
export async function reviewDeposit(
  depositId: string,
  reviewerId: string,
  action: "APPROVE" | "REJECT",
  note?: string,
) {
  return prisma.$transaction(async (tx) => {
    const locked = await lockDeposit(tx, depositId);
    if (!locked) throw AppError.notFound("Deposit not found");
    const deposit = await tx.deposit.findUniqueOrThrow({ where: { id: depositId } });
    if (deposit.status !== "PENDING") throw AppError.conflict("Deposit has already been reviewed");

    const updated = await tx.deposit.update({
      where: { id: depositId },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        reviewedById: reviewerId,
        reviewNote: note,
        reviewedAt: new Date(),
      },
    });

    if (action === "APPROVE") {
      await adjustWalletBalance(tx, {
        userId: deposit.userId,
        amount: deposit.amount,
        type: "DEPOSIT",
        referenceType: "DEPOSIT",
        referenceId: deposit.id,
        note: `Deposit via ${deposit.method}`,
      });
    }

    return updated;
  });
}

/**
 * The gateway-confirmed counterpart to `reviewDeposit` above — same
 * row-lock + idempotent-status-check + atomic-credit shape, but triggered
 * by `PaymentGateway.confirm()` (server-side, re-verified with the gateway's
 * own API) rather than an admin click. Called by both the public callback
 * route and the reconciliation cron job, so it must be safe to call
 * multiple times for the same deposit — only the first PAID confirmation
 * actually credits the wallet.
 */
export async function confirmGatewayDeposit(
  gatewayRef: string,
  result: { status: "PAID" | "FAILED" | "PENDING"; gatewayProvider: string },
) {
  return prisma.$transaction(async (tx) => {
    const deposit = await tx.deposit.findUnique({ where: { gatewayRef } });
    if (!deposit) throw AppError.notFound("Deposit not found for this payment reference");

    const locked = await lockDeposit(tx, deposit.id);
    if (!locked) throw AppError.notFound("Deposit not found");

    // Re-read after acquiring the lock — another concurrent confirm() may
    // have already resolved this deposit while we were waiting for the lock.
    const current = await tx.deposit.findUniqueOrThrow({ where: { id: deposit.id } });
    if (current.status !== "PENDING") {
      return current; // already resolved — idempotent no-op, not an error
    }
    if (result.status === "PENDING") {
      return current; // gateway hasn't confirmed payment yet; leave PENDING for the next poll/callback
    }

    const updated = await tx.deposit.update({
      where: { id: deposit.id },
      data: {
        status: result.status === "PAID" ? "APPROVED" : "REJECTED",
        reviewNote: `Auto-confirmed via ${result.gatewayProvider} API`,
        reviewedAt: new Date(),
      },
    });

    if (result.status === "PAID") {
      await adjustWalletBalance(tx, {
        userId: current.userId,
        amount: current.amount,
        type: "DEPOSIT",
        referenceType: "DEPOSIT",
        referenceId: current.id,
        note: `Deposit via ${result.gatewayProvider}`,
      });
    }

    return updated;
  });
}
