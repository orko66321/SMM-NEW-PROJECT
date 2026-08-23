import { Router } from "express";
import { createCategorySchema, paginationQuerySchema, serviceInputSchema, serviceObjectSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createCategory,
  createService,
  deleteService,
  listCategories,
  listServicesForAdmin,
  updateService,
} from "../../services/catalog.service.js";
import { writeAuditLog } from "../../services/audit.service.js";

export const adminServicesRouter = Router();

adminServicesRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => res.json({ items: await listCategories() })),
);

adminServicesRouter.post(
  "/categories",
  validate(createCategorySchema),
  asyncHandler(async (req, res) => {
    const category = await createCategory(req.body);
    res.status(201).json({ category });
  }),
);

adminServicesRouter.get(
  "/",
  validate(paginationQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    const result = await listServicesForAdmin(page, pageSize);
    res.json({
      ...result,
      items: result.items.map((s) => ({
        ...s,
        sellPricePer1000: s.sellPricePer1000.toString(),
        providerCostPer1000: s.providerCostPer1000.toString(),
      })),
    });
  }),
);

adminServicesRouter.post(
  "/",
  validate(serviceInputSchema),
  asyncHandler(async (req, res) => {
    const service = await createService(req.body);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "service.create",
      targetType: "Service",
      targetId: service.id,
      after: req.body,
      ip: req.ip,
    });
    res.status(201).json({ service });
  }),
);

adminServicesRouter.put(
  "/:id",
  validate(serviceObjectSchema.partial()),
  asyncHandler(async (req, res) => {
    const service = await updateService(req.params.id!, req.body);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "service.update",
      targetType: "Service",
      targetId: req.params.id!,
      after: req.body,
      ip: req.ip,
    });
    res.json({ service });
  }),
);

adminServicesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteService(req.params.id!);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "service.disable",
      targetType: "Service",
      targetId: req.params.id!,
      ip: req.ip,
    });
    res.status(204).end();
  }),
);
