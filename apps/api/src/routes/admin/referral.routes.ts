import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getReferralAnalyticsForAdmin } from "../../services/referral.service.js";

export const adminReferralRouter = Router();

adminReferralRouter.get(
  "/analytics",
  asyncHandler(async (_req, res) => {
    res.json(await getReferralAnalyticsForAdmin());
  }),
);
