import { Router } from "express";
import { couponInputSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createCoupon, deleteCoupon, listCouponsForAdmin, updateCoupon } from "../../services/coupon.service.js";
import { writeAuditLog } from "../../services/audit.service.js";
export const adminCouponsRouter = Router();
adminCouponsRouter.get("/", asyncHandler(async (_req, res) => {
    res.json({ items: await listCouponsForAdmin() });
}));
adminCouponsRouter.post("/", validate(couponInputSchema), asyncHandler(async (req, res) => {
    const coupon = await createCoupon(req.body);
    await writeAuditLog({ actorId: req.user.id, action: "coupon.create", targetType: "Coupon", targetId: coupon.id, after: req.body, ip: req.ip });
    res.status(201).json({ coupon });
}));
adminCouponsRouter.put("/:id", validate(couponInputSchema.partial()), asyncHandler(async (req, res) => {
    const coupon = await updateCoupon(req.params.id, req.body);
    await writeAuditLog({ actorId: req.user.id, action: "coupon.update", targetType: "Coupon", targetId: req.params.id, after: req.body, ip: req.ip });
    res.json({ coupon });
}));
adminCouponsRouter.delete("/:id", asyncHandler(async (req, res) => {
    await deleteCoupon(req.params.id);
    await writeAuditLog({ actorId: req.user.id, action: "coupon.delete", targetType: "Coupon", targetId: req.params.id, ip: req.ip });
    res.status(204).end();
}));
