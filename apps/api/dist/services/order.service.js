import crypto from "node:crypto";
import { Prisma } from "#prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { adjustWalletBalance } from "./wallet.service.js";
import { getProviderOrThrow, submitProviderRefill } from "./providerClient.service.js";
function requestFingerprint(input) {
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
export async function createOrder(userId, input, idempotencyKey) {
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
        throw AppError.badRequest(`Quantity must be between ${service.minQuantity} and ${service.maxQuantity} for this service`);
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
    }
    catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            // Concurrent request with the same idempotency key won the race.
            throw AppError.conflict("A duplicate request is already being processed. Please retry.");
        }
        throw err;
    }
}
function serializeOrder(order) {
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
export async function listOrdersForUser(userId, page, pageSize, status) {
    const where = { userId, ...(status ? { status: status } : {}) };
    const [items, total] = await Promise.all([
        prisma.order.findMany({
            where,
            include: { service: { select: { name: true, refillEnabled: true } } },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.order.count({ where }),
    ]);
    return { items, total, page, pageSize };
}
export async function listOrdersForAdmin(page, pageSize, status, search) {
    const where = {
        ...(status ? { status: status } : {}),
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
export async function updateOrderStatus(orderId, input) {
    return prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw AppError.notFound("Order not found");
        const isNewlyTerminatedWithoutRefund = (input.status === "CANCELED" || input.status === "FAILED") &&
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
export async function markOrderSubmittedToProvider(orderId, providerOrderId) {
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
export async function requestRefill(userId, orderId) {
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
export async function listRefillsForOrder(userId, orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
    if (!order || order.userId !== userId)
        throw AppError.notFound("Order not found");
    return prisma.refillRequest.findMany({ where: { orderId }, orderBy: { createdAt: "desc" } });
}
export async function listRefillsForAdmin(page, pageSize, status) {
    const where = status ? { status: status } : {};
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
export async function resolveManualRefill(refillId, input) {
    const refill = await prisma.refillRequest.findUnique({ where: { id: refillId } });
    if (!refill)
        throw AppError.notFound("Refill request not found");
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
export async function updateRefillStatus(refillId, status) {
    return prisma.refillRequest.update({ where: { id: refillId }, data: { status } });
}
