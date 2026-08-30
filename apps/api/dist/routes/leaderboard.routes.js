import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getTopSpenders } from "../services/leaderboard.service.js";
export const leaderboardRouter = Router();
leaderboardRouter.use(authenticate);
leaderboardRouter.get("/top-spenders", asyncHandler(async (_req, res) => {
    const items = await getTopSpenders(10);
    res.json({ items });
}));
