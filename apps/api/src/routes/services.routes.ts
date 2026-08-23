import { Router } from "express";
import { paginationQuerySchema } from "@smm/shared";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { listCategories, listServices } from "../services/catalog.service.js";

export const servicesRouter = Router();
servicesRouter.use(authenticate);

servicesRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    res.json({ items: await listCategories() });
  }),
);

servicesRouter.get(
  "/",
  validate(paginationQuerySchema, "query"),
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
