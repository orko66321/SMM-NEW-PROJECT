import { Router } from "express";
import { updateSiteNoticeSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getAdminSiteNotice, updateSiteNotice } from "../../services/siteNotice.service.js";
import { writeAuditLog } from "../../services/audit.service.js";

export const adminSiteNoticeRouter = Router();

adminSiteNoticeRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await getAdminSiteNotice());
  }),
);

adminSiteNoticeRouter.put(
  "/",
  validate(updateSiteNoticeSchema),
  asyncHandler(async (req, res) => {
    await updateSiteNotice(req.body);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "siteNotice.update",
      targetType: "SiteNotice",
      targetId: "default",
      after: req.body,
      ip: req.ip,
    });
    res.status(204).end();
  }),
);
