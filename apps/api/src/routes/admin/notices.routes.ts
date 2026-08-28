import { Router } from "express";
import { noticeInputSchema, noticeObjectSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createNotice, deleteNotice, listNoticesForAdmin, updateNotice } from "../../services/notice.service.js";
import { writeAuditLog } from "../../services/audit.service.js";

export const adminNoticesRouter = Router();

adminNoticesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ items: await listNoticesForAdmin() });
  }),
);

adminNoticesRouter.post(
  "/",
  validate(noticeInputSchema),
  asyncHandler(async (req, res) => {
    const notice = await createNotice(req.body);
    await writeAuditLog({ actorId: req.user!.id, action: "notice.create", targetType: "Notice", targetId: notice.id, after: req.body, ip: req.ip });
    res.status(201).json({ notice });
  }),
);

adminNoticesRouter.put(
  "/:id",
  validate(noticeObjectSchema.partial()),
  asyncHandler(async (req, res) => {
    const notice = await updateNotice(req.params.id!, req.body);
    await writeAuditLog({ actorId: req.user!.id, action: "notice.update", targetType: "Notice", targetId: req.params.id!, after: req.body, ip: req.ip });
    res.json({ notice });
  }),
);

adminNoticesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteNotice(req.params.id!);
    await writeAuditLog({ actorId: req.user!.id, action: "notice.delete", targetType: "Notice", targetId: req.params.id!, ip: req.ip });
    res.status(204).end();
  }),
);
