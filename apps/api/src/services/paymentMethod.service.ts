import type { PaymentMethodInput } from "@smm/shared";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";

function serialize(m: {
  id: string;
  title: string;
  gatewayType: string;
  accountType: string;
  accountNumber: string | null;
  instructions: string | null;
  minAmount: { toString(): string };
  maxAmount: { toString(): string };
  bonusPercent: { toString(): string };
  gatewayProvider: string | null;
  status: string;
  sortOrder: number;
}) {
  return {
    id: m.id,
    title: m.title,
    gatewayType: m.gatewayType,
    accountType: m.accountType,
    accountNumber: m.accountNumber,
    instructions: m.instructions,
    minAmount: m.minAmount.toString(),
    maxAmount: m.maxAmount.toString(),
    bonusPercent: m.bonusPercent.toString(),
    gatewayProvider: m.gatewayProvider,
    status: m.status,
    sortOrder: m.sortOrder,
  };
}

/** Public — what the Add Funds page renders. Only ever ACTIVE methods, ordered for display. */
export async function listActivePaymentMethods() {
  const methods = await prisma.paymentMethod.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return methods.map(serialize);
}

export async function listPaymentMethodsForAdmin() {
  const methods = await prisma.paymentMethod.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return methods.map(serialize);
}

export async function createPaymentMethod(input: PaymentMethodInput) {
  const method = await prisma.paymentMethod.create({ data: input });
  return serialize(method);
}

export async function updatePaymentMethod(id: string, input: Partial<PaymentMethodInput>) {
  const existing = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Payment method not found");

  // paymentMethodObjectSchema deliberately has no .refine() so this route's
  // `.partial()` validation works at all (see its comment) — but that means
  // Zod alone never checks maxAmount >= minAmount or "AUTOMATED requires
  // gatewayProvider" on a PUT, since a partial patch might touch only one
  // side of either rule. Re-check both against the FINAL merged state
  // (existing row + this patch), not just whatever fields happen to be in
  // `input` — otherwise PATCHing only minAmount past the existing
  // maxAmount, or flipping gatewayType to AUTOMATED without ever touching
  // gatewayProvider, would silently produce an invalid row (this is
  // exactly how a live payment method ended up with minAmount stuck at 0).
  const merged = {
    minAmount: input.minAmount ?? Number(existing.minAmount),
    maxAmount: input.maxAmount ?? Number(existing.maxAmount),
    gatewayType: input.gatewayType ?? existing.gatewayType,
    gatewayProvider: input.gatewayProvider !== undefined ? input.gatewayProvider : existing.gatewayProvider,
  };
  if (merged.maxAmount < merged.minAmount) {
    throw AppError.badRequest("maxAmount must be >= minAmount");
  }
  if (merged.gatewayType !== "MANUAL" && !merged.gatewayProvider) {
    throw AppError.badRequest("AUTOMATED methods require a gatewayProvider");
  }

  const method = await prisma.paymentMethod.update({ where: { id }, data: input });
  return serialize(method);
}

/**
 * A method with deposit history can't be hard-deleted (Deposit.paymentMethodId
 * has onDelete: Restrict, so the ledger's "paid via X" trail never breaks) —
 * callers get a clear "disable instead" error rather than a raw FK violation.
 */
export async function deletePaymentMethod(id: string) {
  const existing = await prisma.paymentMethod.findUnique({ where: { id }, include: { _count: { select: { deposits: true } } } });
  if (!existing) throw AppError.notFound("Payment method not found");
  if (existing._count.deposits > 0) {
    throw AppError.conflict("This method has deposit history — disable it instead of deleting it");
  }
  await prisma.paymentMethod.delete({ where: { id } });
}
