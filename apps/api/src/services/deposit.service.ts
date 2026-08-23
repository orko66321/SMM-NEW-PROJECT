import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { adjustWalletBalance } from "./wallet.service.js";
import type { CreateManualDepositInput } from "@smm/shared";

/** Row-locks a Deposit within an existing transaction — see wallet.service.ts's adjustWalletBalance for the same pattern applied to wallets. */
async function lockDeposit(tx: Prisma.TransactionClient, depositId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Deposit" WHERE "id" = ${depositId} FOR UPDATE`;
  return rows[0];
}

/**
 * Credits a just-approved deposit's principal, plus a bonus ledger row if
 * its PaymentMethod carries a bonusPercent — called from inside the same
 * transaction as the PENDING→APPROVED status flip in both `reviewDeposit`
 * (manual/admin) and `confirmGatewayDeposit` (gateway-confirmed) below, so
 * "approved" and "credited" can never diverge.
 */
async function creditApprovedDeposit(
  tx: Prisma.TransactionClient,
  deposit: { id: string; userId: string; amount: Prisma.Decimal; method: string; paymentMethodId: string | null },
) {
  await adjustWalletBalance(tx, {
    userId: deposit.userId,
    amount: deposit.amount,
    type: "DEPOSIT",
    referenceType: "DEPOSIT",
    referenceId: deposit.id,
    note: `Deposit via ${deposit.method}`,
  });

  let bonusAmount = new Prisma.Decimal(0);
  if (deposit.paymentMethodId) {
    const method = await tx.paymentMethod.findUnique({ where: { id: deposit.paymentMethodId } });
    if (method && method.bonusPercent.greaterThan(0)) {
      bonusAmount = deposit.amount.mul(method.bonusPercent).div(100);
      await adjustWalletBalance(tx, {
        userId: deposit.userId,
        amount: bonusAmount,
        type: "DEPOSIT_BONUS",
        referenceType: "DEPOSIT",
        referenceId: deposit.id,
        note: `${method.bonusPercent}% deposit bonus via ${deposit.method}`,
      });
    }
  }

  if (bonusAmount.greaterThan(0)) {
    await tx.deposit.update({ where: { id: deposit.id }, data: { bonusAmount } });
  }
}

// ── Manual deposits (Phase 3 dynamic Payment Method queue) ────────────────

export async function createManualDeposit(userId: string, input: CreateManualDepositInput) {
  const method = await prisma.paymentMethod.findUnique({ where: { id: input.paymentMethodId } });
  if (!method || method.status !== "ACTIVE" || method.gatewayType !== "MANUAL") {
    throw AppError.badRequest("This payment method is not available");
  }
  if (input.amount < Number(method.minAmount) || input.amount > Number(method.maxAmount)) {
    throw AppError.badRequest(`Amount must be between ${method.minAmount} and ${method.maxAmount}`);
  }

  // Friendly pre-check — the Deposit.trxId @unique constraint is the actual
  // guarantee against a race (two concurrent submits with the same trxId);
  // this just turns that race's loser into a clear 409 instead of a raw
  // Prisma constraint-violation error.
  const existing = await prisma.deposit.findUnique({ where: { trxId: input.trxId } });
  if (existing) {
    throw AppError.conflict("This transaction ID has already been submitted");
  }

  try {
    return await prisma.deposit.create({
      data: {
        userId,
        method: method.title,
        amount: input.amount,
        status: "PENDING",
        paymentMethodId: method.id,
        trxId: input.trxId,
        senderNumber: input.senderNumber,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw AppError.conflict("This transaction ID has already been submitted");
    }
    throw err;
  }
}

// ── Gateway-initiated deposits (Phase 2/3 automated flow) ──────────────────

/**
 * Creates the Deposit row *before* calling the gateway's create/initiate
 * API, so we control our own reference from the start — some gateways
 * (ZiniPay) only echo their own reference back on the async webhook, not
 * ours, so the browser-redirect leg needs a reference we chose ourselves
 * (see routes/payments.routes.ts). `gatewayRef` is filled in right after
 * the gateway call succeeds via `setDepositGatewayRef`.
 */
export async function createPendingGatewayDeposit(params: {
  userId: string;
  amount: Prisma.Decimal.Value;
  gatewayProvider: string;
  paymentMethodId?: string;
}) {
  let methodTitle: string = params.gatewayProvider;
  if (params.paymentMethodId) {
    const method = await prisma.paymentMethod.findUnique({ where: { id: params.paymentMethodId } });
    if (method) methodTitle = method.title;
  }

  return prisma.deposit.create({
    data: {
      userId: params.userId,
      method: methodTitle,
      amount: params.amount,
      status: "PENDING",
      gatewayProvider: params.gatewayProvider,
      paymentMethodId: params.paymentMethodId,
    },
  });
}

export async function setDepositGatewayRef(depositId: string, gatewayRef: string) {
  await prisma.deposit.update({ where: { id: depositId }, data: { gatewayRef } });
}

export async function getDepositById(depositId: string) {
  return prisma.deposit.findUnique({ where: { id: depositId } });
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
 * Approving a deposit credits the user's wallet (+ any payment-method bonus)
 * atomically with the status flip, inside one transaction — a deposit can
 * never end up "approved" in the ledger without the wallet actually being
 * credited, or vice versa.
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
      await creditApprovedDeposit(tx, deposit);
      // creditApprovedDeposit may have written bonusAmount after `updated`
      // was captured above — re-fetch so the returned row (and therefore
      // the API response) reflects it.
      return tx.deposit.findUniqueOrThrow({ where: { id: depositId } });
    }

    return updated;
  });
}

/**
 * The gateway-confirmed counterpart to `reviewDeposit` above — same
 * row-lock + idempotent-status-check + atomic-credit shape, but triggered
 * by `PaymentGateway.confirm()` (server-side, re-verified with the gateway's
 * own API) rather than an admin click. Called by the callback route, the
 * webhook route, and the reconciliation cron — all three must be safe to
 * call multiple times for the same deposit; only the first PAID confirmation
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
      return current; // gateway hasn't confirmed payment yet; leave PENDING for the next poll/callback/webhook
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
      await creditApprovedDeposit(tx, current);
      // Same reasoning as reviewDeposit above — bonusAmount is written after
      // `updated` was captured, so re-fetch to return the final row.
      return tx.deposit.findUniqueOrThrow({ where: { id: deposit.id } });
    }

    return updated;
  });
}
