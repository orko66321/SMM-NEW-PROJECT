import { Router } from "express";
import { dailyStatsQuerySchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getAdminStats, getDailySalesStats } from "../../services/stats.service.js";

export const adminStatsRouter = Router();

adminStatsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await getAdminStats());
  }),
);

adminStatsRouter.get(
  "/daily",
  validate(dailyStatsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { days } = req.query as unknown as { days: number };
    res.json({ items: await getDailySalesStats(days) });
  }),
);
