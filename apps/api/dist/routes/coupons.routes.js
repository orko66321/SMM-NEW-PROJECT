import { Router } from "express";
import { validateCouponSchema } from "@smm/shared";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateCoupon } from "../services/coupon.service.js";
export const couponsRouter = Router();
couponsRouter.use(authenticate);
// Live preview for the deposit page's coupon box — read-only, never mutates
// usedCount (that only happens atomically at credit time, see
// coupon.service.ts's redeemCouponForDeposit).
couponsRouter.post("/validate", validate(validateCouponSchema), asyncHandler(async (req, res) => {
    const { code, amount } = req.body;
    const { bonusAmount } = await validateCoupon(code, req.user.id, amount);
    res.json({ valid: true, bonusAmount: bonusAmount.toString() });
}));
