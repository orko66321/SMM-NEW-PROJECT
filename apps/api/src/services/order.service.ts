import crypto from "node:crypto";
import { Prisma } from "#prisma/client";
import type { CreateOrderInput, ResolveManualRefillInput, UpdateOrderStatusInput } from "@smm/shared";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { adjustWalletBalance } from "./wallet.service.js";
import { getProviderOrThrow, submitProviderRefill } from "./providerClient.service.js";

function requestFingerprint(input: CreateOrderInput): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

/**
 * The actual order-placement work, extracted so it can run inside a
 * transaction the CALLER already opened — createOrder (below) opens its own
 * via prisma.$transaction for the normal direct-submit path; fulfillOrderIntent
 * further down calls this inside confirmGatewayDeposit's existing transaction,
 * so "wallet credited from the deposit" and "order placed" are one atomic
 * unit for the insufficient-balance-redirect path too. Two safety properties
 * are non-negotiable regardless of caller:
 *
 * 1. Price is always recalculated from the Service row on the server —
 *    `input` never carries a price, so there is nothing for a tampered
 *    client request (or a stale OrderIntent snapshot) to override.
 * 2. Order creation + wallet debit happen atomically, keyed by an
 *    Idempotency-Key, so a duplicated submit (double click, network retry,
 *    replay, or a second deposit confirming the same already-fulfilled
 *    intent) can never charge the wallet twice.
 */
export async function placeOrderInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  input: CreateOrderInput,
  idempotencyKey: string,
) {
  const requestHash = requestFingerprint(input);

  const existingKey = await tx.idempotencyKey.findUnique({
    where: { userId_key: { userId, key: idempotencyKey } },
  });
  if (existingKey) {
    if (existingKey.requestHash !== requestHash) {
      throw AppError.conflict("This idempotency key was already used for a different request");
    }
    return JSON.parse(existingKey.responseJson ?? "null");
  }

  const service = await tx.service.findUnique({ where: { id: input.serviceId } });
  if (!service || service.status !== "ACTIVE") {
    throw AppError.badRequest("Service is not available");
  }
  if (input.quantity < service.minQuantity || input.quantity > service.maxQuantity) {
    throw AppError.badRequest(
      `Quantity must be between ${service.minQuantity} and ${service.maxQuantity} for this service`,
    );
  }

  const charge = new Prisma.Decimal(service.sellPricePer1000).mul(input.quantity).div(1000);
  const providerCost = new Prisma.Decimal(service.providerCostPer1000).mul(input.quantity).div(1000);

  const order = await tx.order.create({
    data: {
      userId,
      serviceId: service.id,
      link: input.link,
      quantity: input.quantity,
      charge,
      providerCost,
      status: "PENDING",
      mode: "MANUAL",
    },
  });

  await adjustWalletBalance(tx, {
    userId,
    amount: charge.negated(),
    type: "ORDER_DEBIT",
    referenceType: "ORDER",
    referenceId: order.id,
    note: `Order for ${service.name}`,
  });

  const responsePayload = serializeOrder(order);

  await tx.idempotencyKey.create({
    data: { userId, key: idempotencyKey, requestHash, responseJson: JSON.stringify(responsePayload) },
  });

  return responsePayload;
}

export async function createOrder(userId: string, input: CreateOrderInput, idempotencyKey: string) {
  try {
    return await prisma.$transaction((tx) => placeOrderInTransaction(tx, userId, input, idempotencyKey));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Concurrent request with the same idempotency key won the race.
      throw AppError.conflict("A duplicate request is already being processed. Please retry.");
    }
    throw err;
  }
}

/**
 * Route handler's actual entry point (see routes/orders.routes.ts). Wraps
 * createOrder with a pre-check: if the wallet can't cover the charge, no
 * money moves and no Order is created — instead an OrderIntent is stashed
 * (see prisma schema) and a 402 is thrown with enough detail for the
 * frontend to redirect straight into the Add Funds flow pre-filled with the
 * shortfall. This is a pre-check, not the authoritative guard — createOrder's
 * own atomic FOR UPDATE debit (wallet.service.ts) is what actually prevents
 * overdraft if the balance changes between this check and the real attempt;
 * worst case on a lost race is an ordinary 400 "Insufficient wallet
 * balance" from the ordinary path, not a double-charge or a stuck intent.
 */
export async function createOrderOrRedirect(userId: string, input: CreateOrderInput, idempotencyKey: string) {
  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service || service.status !== "ACTIVE") {
    throw AppError.badRequest("Service is not available");
  }
  if (input.quantity < service.minQuantity || input.quantity > service.maxQuantity) {
    throw AppError.badRequest(
      `Quantity must be between ${service.minQuantity} and ${service.maxQuantity} for this service`,
    );
  }

  const charge = new Prisma.Decimal(service.sellPricePer1000).mul(input.quantity).div(1000);
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  const balance = wallet?.balance ?? new Prisma.Decimal(0);

  if (balance.greaterThanOrEqualTo(charge)) {
    const order = await createOrder(userId, input, idempotencyKey);
    return { kind: "ORDER" as const, order };
  }

  const shortfall = charge.minus(balance);
  const intent = await prisma.orderIntent.create({
    data: {
      userId,
      serviceId: service.id,
      link: input.link,
      quantity: input.quantity,
      charge,
      idempotencyKey,
      // 30 minutes is generous for "go pay, come back" without leaving a
      // funded-but-forgotten intent sitting around indefinitely — after
      // this, fulfillOrderIntent just credits the wallet and leaves the
      // order to be placed manually rather than auto-submitting stale input.
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  throw new AppError(402, "Insufficient wallet balance", {
    orderIntentId: intent.id,
    charge: charge.toString(),
    balance: balance.toString(),
    shortfall: shortfall.toString(),
  });
}

/**
 * Called from inside confirmGatewayDeposit's transaction (deposit.service.ts)
 * right after the deposit's wallet credit — attempts to place the order the
 * user was originally trying to submit. Deliberately swallows any failure
 * (service went inactive meanwhile, price moved and the credited amount no
 * longer covers it, quantity bounds changed, intent already handled by a
 * prior confirm, expired) rather than propagating it: the deposit credit
 * must never be rolled back just because auto-placement didn't work out —
 * the user still has the money in their wallet either way and can place the
 * order by hand. Only ever called with intent.status already confirmed
 * PENDING by the caller.
 */
export async function fulfillOrderIntent(
  tx: Prisma.TransactionClient,
  intent: { id: string; userId: string; serviceId: string; link: string; quantity: number; idempotencyKey: string; expiresAt: Date },
) {
  if (intent.expiresAt < new Date()) {
    await tx.orderIntent.update({ where: { id: intent.id }, data: { status: "EXPIRED" } });
    return;
  }
  // A SAVEPOINT, not a bare try/catch, is load-bearing here: this whole
  // function runs inside confirmGatewayDeposit's already-open transaction,
  // and placeOrderInTransaction writes the Order row *before* the wallet
  // debit that can fail (matching createOrder's normal order of
  // operations). Catching that failure ourselves stops it from propagating
  // to prisma.$transaction() — which is the ONLY thing that triggers a
  // rollback — so without a savepoint, a caught failure here would leave
  // the just-created (unpaid) Order row committed anyway, orphaned with no
  // matching debit. Rolling back to the savepoint discards exactly that
  // partial write while leaving the deposit credit before it untouched.
  await tx.$executeRawUnsafe("SAVEPOINT fulfill_order_intent");
  try {
    const order = await placeOrderInTransaction(
      tx,
      intent.userId,
      { serviceId: intent.serviceId, link: intent.link, quantity: intent.quantity },
      intent.idempotencyKey,
    );
    await tx.orderIntent.update({ where: { id: intent.id }, data: { status: "FULFILLED", orderId: order.id } });
  } catch (err) {
    await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT fulfill_order_intent");
    const reason = err instanceof AppError ? err.message : "Order placement failed";
    await tx.orderIntent.update({ where: { id: intent.id }, data: { status: "FAILED", failureReason: reason } });
  }
}

function serializeOrder(order: {
  id: string;
  userId: string;
  serviceId: string;
  link: string;
  quantity: number;
  charge: Prisma.Decimal;
  providerCost: Prisma.Decimal;
  startCount: number | null;
  remains: number | null;
  status: string;
  mode: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: order.id,
    userId: order.userId,
    serviceId: order.serviceId,
    link: order.link,
    quantity: order.quantity,
    charge: order.charge.toString(),
    status: order.status,
    mode: order.mode,
    startCount: order.startCount,
    remains: order.remains,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export async function listOrdersForUser(userId: string, page: number, pageSize: number, status?: string) {
  const where = { userId, ...(status ? { status: status as never } : {}) };
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { service: { select: { name: true, nameBn: true, refillEnabled: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function listOrdersForAdmin(
  page: number,
  pageSize: number,
  status?: string,
  search?: string,
  dateRange?: { from?: Date; to?: Date },
  likeOnly?: boolean,
) {
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { id: { equals: search } },
            { link: { contains: search, mode: "insensitive" } },
            { user: { username: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(dateRange?.from || dateRange?.to
      ? { createdAt: { ...(dateRange.from ? { gte: dateRange.from } : {}), ...(dateRange.to ? { lt: dateRange.to } : {}) } }
      : {}),
    // "Like" orders are identified by their service category's name (e.g.
    // "Instagram Likes") — the schema has no dedicated order-type flag, so
    // this is the closest real signal for the admin dashboard's Like Orders
    // cards.
    ...(likeOnly ? { service: { category: { name: { contains: "Like", mode: "insensitive" } } } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { service: { select: { name: true } }, user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

/**
 * Admin status update. If an order is canceled/failed after having been
 * charged, the customer is refunded atomically in the same transaction —
 * an order can never be left in "canceled but still charged" limbo.
 */
export async function updateOrderStatus(orderId: string, input: UpdateOrderStatusInput) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw AppError.notFound("Order not found");

    const isNewlyTerminatedWithoutRefund =
      (input.status === "CANCELED" || input.status === "FAILED") &&
      order.status !== "CANCELED" &&
      order.status !== "FAILED";

    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: input.status,
        ...(input.startCount !== undefined ? { startCount: input.startCount } : {}),
        ...(input.remains !== undefined ? { remains: input.remains } : {}),
      },
    });

    if (isNewlyTerminatedWithoutRefund) {
      await adjustWalletBalance(tx, {
        userId: order.userId,
        amount: order.charge,
        type: "ORDER_REFUND",
        referenceType: "ORDER",
        referenceId: order.id,
        note: `Refund for ${input.status.toLowerCase()} order`,
      });
    }

    return updated;
  });
}

// ── Auto-fulfillment support (Phase 2 — see apps/api/src/cron/) ──────────

/** Orders eligible for automatic provider submission: PENDING, not yet submitted, and the service has opted in. */
export async function findPendingAutoSubmitOrders(limit = 25) {
  return prisma.order.findMany({
    where: { status: "PENDING", providerOrderId: null, service: { autoSubmit: true } },
    include: { service: { include: { provider: true, backupProvider: true } } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export async function markOrderSubmittedToProvider(orderId: string, providerOrderId: string) {
  return prisma.order.update({
    where: { id: orderId },
    data: { providerOrderId, status: "PROCESSING", mode: "AUTO" },
  });
}

/** Orders actively being fulfilled by a provider — what the status-polling cron reconciles. */
export async function findActiveProviderOrders(limit = 200) {
  return prisma.order.findMany({
    where: { status: { in: ["PROCESSING", "IN_PROGRESS"] }, providerOrderId: { not: null } },
    include: { service: { include: { provider: true } } },
    take: limit,
  });
}

// ── Refills ────────────────────────────────────────────────────────────────

/**
 * Requests a refill for a delivered order. Only the order's own owner may
 * call this (enforced by the `userId` match below, mirroring every other
 * user-scoped lookup in this file) and only once per order at a time — a
 * second request while one is already REQUESTED/IN_PROGRESS is rejected
 * rather than silently creating a duplicate provider-side request.
 *
 * An AUTO order that actually reached a provider is submitted immediately
 * (action=refill); everything else (MANUAL mode, or an AUTO order that
 * somehow never got a providerOrderId) drops into the same admin-resolved
 * queue shape used for manual deposits — see resolveManualRefill below.
 */
export async function requestRefill(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { service: true },
  });
  if (!order || order.userId !== userId) {
    throw AppError.notFound("Order not found");
  }
  if (!order.service.refillEnabled) {
    throw AppError.badRequest("This service is not eligible for refill");
  }
  if (order.status !== "COMPLETED" && order.status !== "PARTIAL") {
    throw AppError.badRequest("Only completed or partially-delivered orders can be refilled");
  }

  const pending = await prisma.refillRequest.findFirst({
    where: { orderId: order.id, status: { in: ["REQUESTED", "IN_PROGRESS"] } },
  });
  if (pending) {
    throw AppError.conflict("A refill request is already in progress for this order");
  }

  if (order.mode === "AUTO" && order.providerOrderId && order.service.providerId) {
    const provider = await getProviderOrThrow(order.service.providerId);
    const providerRefillId = await submitProviderRefill(provider, order.providerOrderId);
    return prisma.refillRequest.create({
      data: { orderId: order.id, providerRefillId, status: "IN_PROGRESS" },
    });
  }

  return prisma.refillRequest.create({ data: { orderId: order.id, status: "REQUESTED" } });
}

export async function listRefillsForOrder(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
  if (!order || order.userId !== userId) throw AppError.notFound("Order not found");
  return prisma.refillRequest.findMany({ where: { orderId }, orderBy: { createdAt: "desc" } });
}

export async function listRefillsForAdmin(page: number, pageSize: number, status?: string) {
  const where = status ? { status: status as never } : {};
  const [items, total] = await Promise.all([
    prisma.refillRequest.findMany({
      where,
      include: { order: { include: { service: { select: { name: true } }, user: { select: { username: true } } } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.refillRequest.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

/** Admin hand-resolves a REQUESTED/IN_PROGRESS refill with no provider to poll (manual-mode orders). */
export async function resolveManualRefill(refillId: string, input: ResolveManualRefillInput) {
  const refill = await prisma.refillRequest.findUnique({ where: { id: refillId } });
  if (!refill) throw AppError.notFound("Refill request not found");
  if (refill.status !== "REQUESTED" && refill.status !== "IN_PROGRESS") {
    throw AppError.conflict("This refill request has already been resolved");
  }
  return prisma.refillRequest.update({
    where: { id: refillId },
    data: { status: input.status, note: input.note },
  });
}

/** Provider-submitted refills still awaiting a terminal status — what cron/pollRefillStatus.ts reconciles. */
export async function findPollableRefills(limit = 200) {
  return prisma.refillRequest.findMany({
    where: { status: "IN_PROGRESS", providerRefillId: { not: null } },
    include: { order: { include: { service: { include: { provider: true } } } } },
    take: limit,
  });
}

export async function updateRefillStatus(refillId: string, status: "COMPLETED" | "REJECTED") {
  return prisma.refillRequest.update({ where: { id: refillId }, data: { status } });
}
