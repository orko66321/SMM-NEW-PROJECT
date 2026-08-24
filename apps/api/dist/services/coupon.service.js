import { Prisma } from "#prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { adjustWalletBalance } from "./wallet.service.js";
function serialize(c) {
    return {
        id: c.id,
        code: c.code,
        type: c.type,
        value: c.value.toString(),
        maxUses: c.maxUses,
        usedCount: c.usedCount,
        expiresAt: c.expiresAt?.toISOString() ?? null,
        active: c.active,
        createdAt: c.createdAt.toISOString(),
    };
}
export async function listCouponsForAdmin() {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    return coupons.map(serialize);
}
export async function createCoupon(input) {
    const existing = await prisma.coupon.findUnique({ where: { code: input.code } });
    if (existing)
        throw AppError.conflict("A coupon with this code already exists");
    const coupon = await prisma.coupon.create({ data: input });
    return serialize(coupon);
}
export async function updateCoupon(id, input) {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing)
        throw AppError.notFound("Coupon not found");
    const coupon = await prisma.coupon.update({ where: { id }, data: input });
    return serialize(coupon);
}
/**
 * A coupon with redemption history can't be hard-deleted — same "disable
 * instead" pattern as paymentMethod.service.ts's deletePaymentMethod, for
 * the same reason: CouponRedemption rows are the permanent ledger-adjacent
 * record of what was actually credited and must never be orphaned.
 */
export async function deleteCoupon(id) {
    const existing = await prisma.coupon.findUnique({ where: { id }, include: { _count: { select: { redemptions: true } } } });
    if (!existing)
        throw AppError.notFound("Coupon not found");
    if (existing._count.redemptions > 0) {
        throw AppError.conflict("This coupon has redemption history — disable it instead of deleting it");
    }
    await prisma.coupon.delete({ where: { id } });
}
function computeBonus(coupon, amount) {
    if (coupon.type === "PERCENT")
        return new Prisma.Decimal(amount).mul(coupon.value).div(100);
    return coupon.value;
}
/**
 * Read-only eligibility check — used for the deposit page's live preview
 * (routes/coupons.routes.ts) and as the fail-fast check when a deposit is
 * first created (deposit.service.ts). Never mutates usedCount; the actual
 * redemption only happens atomically at credit time, see
 * redeemCouponForDeposit below.
 */
export async function validateCoupon(code, userId, amount) {
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.active)
        throw AppError.badRequest("Invalid or inactive coupon code");
    if (coupon.expiresAt && coupon.expiresAt < new Date())
        throw AppError.badRequest("This coupon has expired");
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        throw AppError.badRequest("This coupon has reached its usage limit");
    }
    const alreadyRedeemed = await prisma.couponRedemption.findUnique({
        where: { couponId_userId: { couponId: coupon.id, userId } },
    });
    if (alreadyRedeemed)
        throw AppError.badRequest("You have already used this coupon");
    return { coupon, bonusAmount: computeBonus(coupon, amount) };
}
/**
 * Called from inside deposit.service.ts's creditApprovedDeposit()
 * transaction — the redemption row, usedCount increment, and wallet bonus
 * credit all commit or roll back together with the deposit's own principal
 * credit, exactly like the existing PaymentMethod.bonusPercent handling it
 * sits alongside.
 *
 * Unlike validateCoupon above, this does NOT throw on an expected
 * ineligibility (expired/deactivated/limit reached/already used since the
 * deposit was created) — it returns null so the deposit itself still gets
 * approved and credited; only the bonus is silently skipped. A coupon
 * becoming stale between deposit creation and admin approval/gateway
 * confirmation should never block the user's actual money from landing.
 */
export async function redeemCouponForDeposit(tx, params) {
    const coupon = await tx.coupon.findUnique({ where: { id: params.couponId } });
    if (!coupon || !coupon.active)
        return null;
    if (coupon.expiresAt && coupon.expiresAt < new Date())
        return null;
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
        return null;
    const already = await tx.couponRedemption.findUnique({
        where: { couponId_userId: { couponId: coupon.id, userId: params.userId } },
    });
    if (already)
        return null;
    const bonusAmount = computeBonus(coupon, params.amount);
    if (!bonusAmount.greaterThan(0))
        return null;
    await tx.couponRedemption.create({
        data: { couponId: coupon.id, userId: params.userId, amount: bonusAmount },
    });
    await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
    // Reuses WalletTxType.DEPOSIT_BONUS — a coupon bonus is the same kind of
    // ledger event as a PaymentMethod's bonusPercent (an extra credit tied to
    // this deposit), so it doesn't warrant its own enum value.
    await adjustWalletBalance(tx, {
        userId: params.userId,
        amount: bonusAmount,
        type: "DEPOSIT_BONUS",
        referenceType: "DEPOSIT",
        referenceId: params.depositId,
        note: `Coupon ${coupon.code} bonus`,
    });
    return bonusAmount;
}
