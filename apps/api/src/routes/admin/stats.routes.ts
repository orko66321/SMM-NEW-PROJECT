import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getAdminStats } from "../../services/stats.service.js";

export const adminStatsRouter = Router();

adminStatsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await getAdminStats());
  }),
);
