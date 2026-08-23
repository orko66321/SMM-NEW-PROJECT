import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import type { CreateOrderInput, UpdateOrderStatusInput } from "@smm/shared";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { adjustWalletBalance } from "./wallet.service.js";

function requestFingerprint(input: CreateOrderInput): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

/**
 * Places an order. Two safety properties are non-negotiable here:
 *
 * 1. Price is always recalculated from the Service row on the server —
 *    `input` never carries a price, so there is nothing for a tampered
 *    client request to override.
 * 2. Order creation + wallet debit happen in a single DB transaction keyed
 *    by a client-supplied Idempotency-Key, so a duplicated submit (double
 *    click, network retry, replay) can never charge the wallet twice.
 */
export async function createOrder(userId: string, input: CreateOrderInput, idempotencyKey: string) {
  const requestHash = requestFingerprint(input);

  const existingKey = await prisma.idempotencyKey.findUnique({
    where: { userId_key: { userId, key: idempotencyKey } },
  });
  if (existingKey) {
    if (existingKey.requestHash !== requestHash) {
      throw AppError.conflict("This idempotency key was already used for a different request");
    }
    return JSON.parse(existingKey.responseJson ?? "null");
  }

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
  const providerCost = new Prisma.Decimal(service.providerCostPer1000).mul(input.quantity).div(1000);

  try {
    return await prisma.$transaction(async (tx) => {
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
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Concurrent request with the same idempotency key won the race.
      throw AppError.conflict("A duplicate request is already being processed. Please retry.");
    }
    throw err;
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
      include: { service: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function listOrdersForAdmin(page: number, pageSize: number, status?: string, search?: string) {
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
