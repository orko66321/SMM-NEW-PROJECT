import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { adjustWalletBalance } from "./wallet.service.js";
import type { CreateDepositInput } from "@smm/shared";

export async function createDeposit(userId: string, input: CreateDepositInput) {
  return prisma.deposit.create({
    data: { userId, method: input.method, amount: input.amount, reference: input.reference },
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
    const deposit = await tx.deposit.findUnique({ where: { id: depositId } });
    if (!deposit) throw AppError.notFound("Deposit not found");
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
