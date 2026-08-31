import crypto from "node:crypto";
import { Prisma } from "#prisma/client";
import { prisma } from "../lib/prisma.js";
import { decrypt } from "../lib/crypto.js";
import { AppError } from "../utils/AppError.js";
import { adjustWalletBalance } from "./wallet.service.js";
import { canUserAccessProduct, assertWithinOrderLimit, sanitizeBuyerInput } from "./product.service.js";
function requestFingerprint(input) {
    return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
/**
 * Atomically claims one AVAILABLE code from whichever of the given pools has
 * one, oldest first. `FOR UPDATE SKIP LOCKED` is load-bearing: it lets two
 * concurrent purchases each grab a *different* row instead of one blocking
 * on the other's lock (which `FOR UPDATE` alone would do) — but still makes
 * "two buyers claim the same code" structurally impossible, same guarantee
 * adjustWalletBalance's row lock gives the wallet balance.
 */
async function claimStockCode(tx, poolIds) {
    if (poolIds.length === 0)
        return null;
    const rows = await tx.$queryRaw `
    SELECT "id" FROM "StockCode"
    WHERE "poolId" IN (${Prisma.join(poolIds)}) AND "status" = 'AVAILABLE'
    ORDER BY "createdAt" ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  `;
    return rows[0] ?? null;
}
/**
 * The Store purchase transaction — mirrors placeOrderInTransaction's shape
 * (order.service.ts) but prices from the Package snapshot, never from a
 * Service. Idempotency-keyed against the same IdempotencyKey table so a
 * duplicated submit (double click / retry) can never charge twice.
 *
 * Fulfillment path is decided by the package/product configuration, never
 * by client input:
 *  - isAuto (only ever valid on an SMM product with a linked Service): the
 *    order is created PENDING/MANUAL mode exactly like a normal Service
 *    order, so the SAME existing auto-submit cron (submitPendingOrders.ts)
 *    picks it up via the Service's own autoSubmit flag — no second
 *    provider-submission code path.
 *  - linked StockPools: a code is claimed and attached atomically, and the
 *    order is delivered immediately (COMPLETED).
 *  - otherwise: PENDING, left for an admin to resolve by hand through the
 *    existing admin Orders page (updateOrderStatus) — same manual-fulfillment
 *    convention plain Services already use.
 */
export async function purchasePackage(userId, input, idempotencyKey) {
    try {
        return await prisma.$transaction(async (tx) => {
            const requestHash = requestFingerprint(input);
            const existingKey = await tx.idempotencyKey.findUnique({ where: { userId_key: { userId, key: idempotencyKey } } });
            if (existingKey) {
                if (existingKey.requestHash !== requestHash) {
                    throw AppError.conflict("This idempotency key was already used for a different request");
                }
                return JSON.parse(existingKey.responseJson ?? "null");
            }
            const pkg = await tx.package.findUnique({
                where: { id: input.packageId },
                include: { product: { include: { brand: true, service: true } }, stockPoolLinks: true },
            });
            if (!pkg || !pkg.product.isActive || !pkg.product.brand.isActive) {
                throw AppError.badRequest("This package is not available");
            }
            const { product } = pkg;
            const user = await tx.user.findUnique({ where: { id: userId }, select: { isVip: true, isReseller: true, apiKeyHash: true } });
            if (!canUserAccessProduct(product, user)) {
                throw AppError.forbidden("You don't have access to this product");
            }
            await assertWithinOrderLimit(tx, userId, product);
            const buyerInput = sanitizeBuyerInput(input.buyerInput, product.removeCharacters);
            if (!buyerInput) {
                throw AppError.badRequest(`${product.userInputFieldName} is required`);
            }
            const charge = new Prisma.Decimal(pkg.salePrice).plus(pkg.extraFee);
            const providerCost = new Prisma.Decimal(pkg.buyPrice);
            let claimedCodeId = null;
            let deliveredCode = null;
            let status = "PENDING";
            let orderServiceId = null;
            if (pkg.isAuto) {
                if (product.productType !== "SMM" || !product.service || product.service.status !== "ACTIVE") {
                    throw AppError.badRequest("This package is not configured for automatic fulfillment");
                }
                orderServiceId = product.service.id;
                // status stays PENDING — the existing submitPendingOrders cron
                // promotes it once it submits to the provider, exactly like a
                // normal Service order.
            }
            else if (pkg.stockPoolLinks.length > 0) {
                const claimed = await claimStockCode(tx, pkg.stockPoolLinks.map((l) => l.poolId));
                if (!claimed) {
                    throw AppError.conflict("This item is temporarily out of stock. Please check back soon.");
                }
                claimedCodeId = claimed.id;
                status = "COMPLETED";
            }
            // else: plain manual queue — stays PENDING for an admin to resolve by hand.
            await adjustWalletBalance(tx, {
                userId,
                amount: charge.negated(),
                type: "ORDER_DEBIT",
                referenceType: "ORDER",
                referenceId: pkg.id,
                note: `Order for ${product.name} — ${pkg.name}`,
            });
            const order = await tx.order.create({
                data: {
                    userId,
                    serviceId: orderServiceId,
                    packageId: pkg.id,
                    link: buyerInput,
                    quantity: pkg.amount,
                    charge,
                    providerCost,
                    status,
                    mode: "MANUAL",
                },
            });
            if (claimedCodeId) {
                const stockCode = await tx.stockCode.update({
                    where: { id: claimedCodeId },
                    data: { status: "CONSUMED", orderId: order.id, consumedAt: new Date() },
                });
                deliveredCode = decrypt(stockCode.codeCiphertext);
            }
            const responsePayload = {
                order: serializeStoreOrder(order),
                deliveredCode,
            };
            await tx.idempotencyKey.create({
                data: { userId, key: idempotencyKey, requestHash, responseJson: JSON.stringify(responsePayload) },
            });
            return responsePayload;
        });
    }
    catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            throw AppError.conflict("A duplicate request is already being processed. Please retry.");
        }
        throw err;
    }
}
function serializeStoreOrder(order) {
    return {
        id: order.id,
        packageId: order.packageId,
        link: order.link,
        quantity: order.quantity,
        charge: order.charge.toString(),
        status: order.status,
        mode: order.mode,
        createdAt: order.createdAt.toISOString(),
    };
}
/** Order history's "re-view the delivered credential" — only the order's own owner may decrypt it. */
export async function getDeliveredCodeForOrder(userId, orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { stockCode: true } });
    if (!order || order.userId !== userId)
        throw AppError.notFound("Order not found");
    if (!order.stockCode)
        throw AppError.notFound("No stock code was delivered for this order");
    return decrypt(order.stockCode.codeCiphertext);
}
