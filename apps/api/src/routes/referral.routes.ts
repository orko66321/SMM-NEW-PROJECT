import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getMyReferralSummary } from "../services/referral.service.js";

export const referralRouter = Router();
referralRouter.use(authenticate);

referralRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    res.json(await getMyReferralSummary(req.user!.id));
  }),
);
