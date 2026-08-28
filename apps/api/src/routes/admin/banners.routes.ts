import { Router } from "express";
import { bannerInputSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createBanner, deleteBanner, listBannersForAdmin, updateBanner } from "../../services/banner.service.js";
import { writeAuditLog } from "../../services/audit.service.js";

export const adminBannersRouter = Router();

adminBannersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    res.json(await listBannersForAdmin(page, pageSize));
  }),
);

adminBannersRouter.post(
  "/",
  validate(bannerInputSchema),
  asyncHandler(async (req, res) => {
    const banner = await createBanner(req.body);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "banner.create",
      targetType: "Banner",
      targetId: banner.id,
      after: { link: req.body.link, order: req.body.order },
      ip: req.ip,
    });
    res.status(201).json({ banner });
  }),
);

adminBannersRouter.put(
  "/:id",
  validate(bannerInputSchema.partial()),
  asyncHandler(async (req, res) => {
    const banner = await updateBanner(req.params.id!, req.body);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "banner.update",
      targetType: "Banner",
      targetId: req.params.id!,
      after: { link: req.body.link, order: req.body.order },
      ip: req.ip,
    });
    res.json({ banner });
  }),
);

adminBannersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteBanner(req.params.id!);
    await writeAuditLog({ actorId: req.user!.id, action: "banner.delete", targetType: "Banner", targetId: req.params.id!, ip: req.ip });
    res.status(204).end();
  }),
);
