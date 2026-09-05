import crypto from "node:crypto";
import { Prisma } from "#prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { adjustWalletBalance } from "./wallet.service.js";
import { getProviderOrThrow, getProviderOrderStatus, mapProviderOrderStatus, submitProviderCancel, submitProviderOrder, submitProviderRefill, } from "./providerClient.service.js";
import { isResendOrderButtonEnabled } from "./settings.service.js";
import { recomputeServiceCompletionStats } from "./catalog.service.js";
/** Provider error text can be long/HTML — keep the DB column and admin UI sane. */
const MAX_API_ERROR_LEN = 4000;
function providerErrorText(err) {
    const raw = err instanceof Error ? err.message : String(err ?? "Unknown provider error");
    return raw.slice(0, MAX_API_ERROR_LEN);
}
function requestFingerprint(input) {
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
export async function placeOrderInTransaction(tx, userId, input, idempotencyKey) {
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
        throw AppError.badRequest(`Quantity must be between ${service.minQuantity} and ${service.maxQuantity} for this service`);
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
export async function createOrder(userId, input, idempotencyKey) {
    try {
        return await prisma.$transaction((tx) => placeOrderInTransaction(tx, userId, input, idempotencyKey));
    }
    catch (err) {
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
export async function createOrderOrRedirect(userId, input, idempotencyKey) {
    const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
    if (!service || service.status !== "ACTIVE") {
        throw AppError.badRequest("Service is not available");
    }
    if (input.quantity < service.minQuantity || input.quantity > service.maxQuantity) {
        throw AppError.badRequest(`Quantity must be between ${service.minQuantity} and ${service.maxQuantity} for this service`);
    }
    const charge = new Prisma.Decimal(service.sellPricePer1000).mul(input.quantity).div(1000);
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    const balance = wallet?.balance ?? new Prisma.Decimal(0);
    if (balance.greaterThanOrEqualTo(charge)) {
        const order = await createOrder(userId, input, idempotencyKey);
        return { kind: "ORDER", order };
    }
    const shortfall = charge.minus(balance);
    const intent = await prisma.orderIntent.create({
        data: {
            userId,
            kind: "SERVICE",
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
    // `charge` is the amount the frontend now sends to the gateway — the FULL
    // order price, not the shortfall: the user's existing wallet balance is
    // left untouched, matching the Store checkout flow (see
    // store.service.ts's purchasePackageOrRedirect). `shortfall`/`balance`
    // stay in the payload for the older Wallet-page fallback path.
    throw new AppError(402, "Insufficient wallet balance", {
        orderIntentId: intent.id,
        kind: "SERVICE",
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
export async function fulfillOrderIntent(tx, intent) {
    // Store (PACKAGE-kind) intents are dispatched to store.service.ts's
    // fulfillStorePackageIntent by the caller — this path only ever runs for a
    // SERVICE intent, which always has a serviceId.
    if (!intent.serviceId) {
        await tx.orderIntent.update({
            where: { id: intent.id },
            data: { status: "FAILED", failureReason: "Order intent has no linked service" },
        });
        return;
    }
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
        const order = await placeOrderInTransaction(tx, intent.userId, { serviceId: intent.serviceId, link: intent.link, quantity: intent.quantity }, intent.idempotencyKey);
        await tx.orderIntent.update({ where: { id: intent.id }, data: { status: "FULFILLED", orderId: order.id } });
    }
    catch (err) {
        await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT fulfill_order_intent");
        const reason = err instanceof AppError ? err.message : "Order placement failed";
        await tx.orderIntent.update({ where: { id: intent.id }, data: { status: "FAILED", failureReason: reason } });
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
            include: {
                service: { select: { name: true, nameBn: true, refillEnabled: true } },
                // Brand/Product/Package name for Store-purchase order history — see
                // store.service.ts's purchasePackage. null for a plain Service order.
                package: { select: { name: true, product: { select: { name: true, brand: { select: { name: true } } } } } },
                stockCode: { select: { id: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.order.count({ where }),
    ]);
    // `apiErrorResponse` is admin-only — a customer sees the order status
    // ("Pending" / "Failed") and nothing about the upstream provider.
    const safeItems = items.map(({ apiErrorResponse: _adminOnly, ...rest }) => rest);
    return { items: safeItems, total, page, pageSize };
}
export async function listOrdersForAdmin(page, pageSize, status, search, dateRange, likeOnly) {
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
            include: {
                service: { select: { name: true } },
                package: { select: { name: true, product: { select: { name: true, brand: { select: { name: true } } } } } },
                user: { select: { username: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.order.count({ where }),
    ]);
    return { items, total, page, pageSize };
}
/**
 * Translates the optional `comment` / `commentLink` on a status-update or
 * standalone comment request into an Order update payload. An explicit empty
 * string or null clears the note; `undefined` (field omitted) leaves it
 * alone. Any change stamps `adminCommentUpdatedAt` so the customer UI can
 * show "updated X ago".
 */
function adminCommentPatch(input) {
    const patch = {};
    if (input.comment !== undefined)
        patch.adminComment = input.comment || null;
    if (input.commentLink !== undefined)
        patch.adminCommentLink = input.commentLink || null;
    if (input.comment !== undefined || input.commentLink !== undefined) {
        patch.adminCommentUpdatedAt = new Date();
    }
    return patch;
}
/**
 * Standalone "save this order's customer-facing note" — the generic Comment
 * action on the admin Orders row. Touches ONLY the note fields, never the
 * order status, charge or anything else.
 */
export async function setOrderAdminComment(orderId, input) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order)
        throw AppError.notFound("Order not found");
    return prisma.order.update({ where: { id: orderId }, data: adminCommentPatch(input) });
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
        // Moving an order into a healthy state clears any stale provider-error
        // text so the admin list doesn't keep flagging an order that's since
        // been resolved by hand.
        const clearsApiError = ["PROCESSING", "IN_PROGRESS", "COMPLETED"].includes(input.status);
        // First transition into a delivered state (COMPLETED/PARTIAL): freeze
        // this order's completion duration, then roll up the service's cached
        // "Average Time". A re-poll of an already-completed order (cron runs
        // every 5 min) sees `nowCompleted` false and skips both.
        const nowCompleted = (input.status === "COMPLETED" || input.status === "PARTIAL") &&
            order.status !== "COMPLETED" &&
            order.status !== "PARTIAL";
        const completedAt = new Date();
        const completionSeconds = Math.max(0, Math.round((completedAt.getTime() - order.createdAt.getTime()) / 1000));
        const stampsCompletion = nowCompleted && order.serviceId !== null;
        const updated = await tx.order.update({
            where: { id: orderId },
            data: {
                status: input.status,
                ...(clearsApiError ? { apiErrorResponse: null } : {}),
                ...(stampsCompletion ? { completedAt, completionSeconds } : {}),
                ...(input.startCount !== undefined ? { startCount: input.startCount } : {}),
                ...(input.remains !== undefined ? { remains: input.remains } : {}),
                // Optional customer-facing note carried alongside the status change
                // (e.g. a "cancelled & refunded" template picked while cancelling).
                ...adminCommentPatch(input),
            },
        });
        if (stampsCompletion) {
            await recomputeServiceCompletionStats(tx, order.serviceId);
        }
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
        // AI Support "Speed up" flags an order `priority` — process those first.
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: limit,
    });
}
export async function markOrderSubmittedToProvider(orderId, providerOrderId) {
    return prisma.order.update({
        where: { id: orderId },
        // A successful submit clears any previous failure text.
        data: { providerOrderId, status: "PROCESSING", mode: "AUTO", apiErrorResponse: null },
    });
}
/** Records the raw provider error text on an order (admin-only field). */
export async function recordOrderProviderError(orderId, err) {
    await prisma.order.update({
        where: { id: orderId },
        data: { apiErrorResponse: providerErrorText(err) },
    });
}
/**
 * Submits `params` to the primary provider, falling back to the backup once
 * — the same two-candidate logic cron/submitPendingOrders.ts uses, so the
 * admin "Resend" action shares one code path with the automatic submitter.
 * Only ever called after the caller has validated the provider mapping; on
 * failure it throws the last provider error (a plain Error, not an AppError).
 */
async function submitToProviders(providerServiceId, candidates, params) {
    let lastError;
    for (const provider of candidates) {
        try {
            return await submitProviderOrder(provider, { service: providerServiceId, link: params.link, quantity: params.quantity });
        }
        catch (err) {
            lastError = err;
        }
    }
    throw lastError instanceof Error ? lastError : new Error("Provider submission failed");
}
/**
 * Admin "Resend / Retry API" for a stuck order (see routes/admin/orders.routes.ts).
 * Only PENDING or FAILED orders that were never actually accepted by a
 * provider are eligible.
 *
 * A FAILED order has already been auto-refunded (see updateOrderStatus /
 * submitPendingOrders), so resending it re-charges the customer's wallet
 * first — atomically, and rejecting if their balance can no longer cover it
 * — then flips the order back to a normal paid PENDING before touching the
 * provider. That means a mid-flight crash leaves an ordinary pending paid
 * order (which the auto-submitter or a second resend picks up), never a
 * double charge or a charged-but-refunded limbo.
 *
 * On provider success: PROCESSING + new providerOrderId + cleared error.
 * On provider failure: the new error text is saved and the order is left
 * PENDING; this function throws so the route surfaces a toast to the admin.
 */
export async function resendOrderToProvider(orderId) {
    if (!(await isResendOrderButtonEnabled())) {
        throw AppError.forbidden("The Resend Order action is disabled in Settings");
    }
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { service: { include: { provider: true, backupProvider: true } } },
    });
    if (!order)
        throw AppError.notFound("Order not found");
    if (order.status !== "PENDING" && order.status !== "FAILED") {
        throw AppError.badRequest("Only pending or failed orders can be resent to the provider");
    }
    if (order.providerOrderId) {
        throw AppError.conflict(`This order was already submitted to a provider (ref ${order.providerOrderId})`);
    }
    if (!order.serviceId || !order.service) {
        throw AppError.badRequest("This order has no provider-backed service — resolve it by hand");
    }
    // Validate the provider mapping up front so these config problems surface
    // as a plain 400, not the 502 reserved for an actual provider rejection.
    const service = order.service;
    if (!service.providerServiceId) {
        throw AppError.badRequest("This order's service has no provider service id mapped — resolve it by hand");
    }
    const candidates = [service.provider, service.backupProvider].filter((p) => p !== null);
    if (candidates.length === 0) {
        throw AppError.badRequest("This order's service has no provider configured — resolve it by hand");
    }
    // FAILED ⇒ already refunded. Re-charge and normalise to PENDING before the
    // network call, so failure/crash can't leave money in a weird place.
    if (order.status === "FAILED") {
        await prisma.$transaction(async (tx) => {
            await adjustWalletBalance(tx, {
                userId: order.userId,
                amount: new Prisma.Decimal(order.charge).negated(),
                type: "ORDER_DEBIT",
                referenceType: "ORDER",
                referenceId: order.id,
                note: "Re-charge — failed order resent to provider",
            });
            await tx.order.update({
                where: { id: order.id },
                data: { status: "PENDING", apiErrorResponse: null },
            });
        });
    }
    try {
        const providerOrderId = await submitToProviders(service.providerServiceId, candidates, {
            link: order.link,
            quantity: order.quantity,
        });
        return await markOrderSubmittedToProvider(order.id, providerOrderId);
    }
    catch (err) {
        await recordOrderProviderError(order.id, err);
        // Order stays PENDING (re-charged if it was FAILED) — the admin can
        // resend again or cancel it (which refunds) from the status control.
        throw new AppError(502, providerErrorText(err));
    }
}
/** Orders actively being fulfilled by a provider — what the status-polling cron reconciles. */
export async function findActiveProviderOrders(limit = 200) {
    return prisma.order.findMany({
        where: { status: { in: ["PROCESSING", "IN_PROGRESS"] }, providerOrderId: { not: null } },
        include: { service: { include: { provider: true } } },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: limit,
    });
}
// ── AI Support / agent-override order actions ───────────────────────────────
// These are the single service-layer entry points the ticket automation
// engine (services/ticketAutomation.service.ts) AND the admin manual-override
// buttons both call — never a second copy of the logic. Each throws AppError
// on ineligibility so the caller can turn it into a ticket escalation or an
// admin-facing message.
const CANCELLABLE_STATUSES = ["PENDING", "PROCESSING", "IN_PROGRESS"];
/**
 * Cancels a still-cancellable order: `action=cancel` upstream for an AUTO
 * order that reached a provider, then flips status to CANCELED —
 * updateOrderStatus issues the wallet refund atomically on that transition
 * (reusing the exact same refund path as an admin status change).
 */
export async function cancelOrderForUser(userId, orderId) {
    const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        include: { service: true },
    });
    if (!order)
        throw AppError.notFound("Order not found");
    if (!order.service?.cancelEnabled) {
        throw AppError.badRequest("This service does not support cancellation");
    }
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
        throw AppError.badRequest("This order can no longer be canceled");
    }
    if (order.mode === "AUTO" && order.providerOrderId && order.service.providerId) {
        const provider = await getProviderOrThrow(order.service.providerId);
        await submitProviderCancel(provider, order.providerOrderId);
    }
    else {
        throw AppError.badRequest("This order has no provider to cancel automatically — a human needs to handle it");
    }
    return updateOrderStatus(orderId, { status: "CANCELED" });
}
/** Re-checks a stuck order against the provider and reconciles local status/remains. */
export async function refreshOrderFromProvider(userId, orderId) {
    const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        include: { service: true },
    });
    if (!order)
        throw AppError.notFound("Order not found");
    if (order.mode !== "AUTO" || !order.providerOrderId || !order.service?.providerId) {
        throw AppError.badRequest("This order has no provider state to refresh — a human needs to check it");
    }
    const provider = await getProviderOrThrow(order.service.providerId);
    const remote = await getProviderOrderStatus(provider, order.providerOrderId);
    const mapped = mapProviderOrderStatus(remote.status);
    const updated = await updateOrderStatus(orderId, {
        status: mapped,
        startCount: remote.start_count !== undefined ? Number(remote.start_count) : undefined,
        remains: remote.remains !== undefined ? Number(remote.remains) : undefined,
    });
    return { order: updated, providerStatus: remote.status };
}
/** Panel-side "priority" flag for the AI Support "Speed up" action. */
export async function prioritizeOrderForUser(userId, orderId) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order)
        throw AppError.notFound("Order not found");
    return prisma.order.update({ where: { id: orderId }, data: { priority: true } });
}
/** Fetches the current provider-reported status for a linked order, or null if there is nothing to fetch. */
export async function peekProviderStatus(userId, orderId) {
    const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        include: { service: true },
    });
    if (!order || order.mode !== "AUTO" || !order.providerOrderId || !order.service?.providerId) {
        return null;
    }
    try {
        const provider = await getProviderOrThrow(order.service.providerId);
        const remote = await getProviderOrderStatus(provider, order.providerOrderId);
        return remote.status ?? null;
    }
    catch {
        return null;
    }
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
    if (!order.service || !order.service.refillEnabled) {
        throw AppError.badRequest("This order is not eligible for refill");
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
