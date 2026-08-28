import { Router } from "express";
import { dailyStatsQuerySchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getAdminOverviewStats, getAdminStats, getDailySalesStats } from "../../services/stats.service.js";
export const adminStatsRouter = Router();
adminStatsRouter.get("/", asyncHandler(async (_req, res) => {
    res.json(await getAdminStats());
}));
// Backs the admin dashboard's stat-card grid (Orders/Users/Sales/Profit/
// Balances). Kept separate from "/" above so the existing summary endpoint
// (and its RBAC test) stays untouched.
adminStatsRouter.get("/overview", asyncHandler(async (_req, res) => {
    res.json(await getAdminOverviewStats());
}));
adminStatsRouter.get("/daily", validate(dailyStatsQuerySchema, "query"), asyncHandler(async (req, res) => {
    const { days } = req.query;
    res.json({ items: await getDailySalesStats(days) });
}));
