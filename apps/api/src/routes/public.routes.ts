import { Router } from "express";
import { serviceListQuerySchema } from "@smm/shared";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { listCategories, listServices } from "../services/catalog.service.js";
import { getPublicSettings } from "../services/settings.service.js";
import { listActiveNotices } from "../services/notice.service.js";
import { getPublicSiteNotice } from "../services/siteNotice.service.js";
import { listBannersPublic } from "../services/banner.service.js";
import { getPublicStats } from "../services/stats.service.js";

// Unauthenticated — powers the landing page, public services catalog, and
// notice banner shown to logged-out visitors. /api/services requires auth
// (servicesRouter.use(authenticate)), so the public catalog needs its own
// route rather than reusing it; both call the same catalog.service.ts
// functions, so there is exactly one place service-listing logic lives.
export const publicRouter = Router();

publicRouter.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    res.json(await getPublicSettings());
  }),
);

publicRouter.get(
  "/notices",
  asyncHandler(async (_req, res) => {
    res.json({ items: await listActiveNotices() });
  }),
);

publicRouter.get(
  "/notice",
  asyncHandler(async (_req, res) => {
    res.json(await getPublicSiteNotice());
  }),
);

publicRouter.get(
  "/banners",
  asyncHandler(async (_req, res) => {
    res.json({ items: await listBannersPublic() });
  }),
);

publicRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    res.json(await getPublicStats());
  }),
);

publicRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    res.json({ items: await listCategories() });
  }),
);

publicRouter.get(
  "/services",
  validate(serviceListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const result = await listServices(page, pageSize, categoryId, search);
    res.json({
      ...result,
      items: result.items.map((s) => ({ ...s, sellPricePer1000: s.sellPricePer1000.toString(), providerCostPer1000: undefined })),
    });
  }),
);
