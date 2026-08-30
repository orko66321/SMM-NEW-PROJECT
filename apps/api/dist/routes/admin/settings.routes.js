import { Router } from "express";
import { sendTestEmailSchema, updateSettingsSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getAdminSettings, sendTestEmail, updateSettings } from "../../services/settings.service.js";
import { writeAuditLog } from "../../services/audit.service.js";
export const adminSettingsRouter = Router();
adminSettingsRouter.get("/", asyncHandler(async (_req, res) => {
    res.json(await getAdminSettings());
}));
adminSettingsRouter.put("/", validate(updateSettingsSchema), asyncHandler(async (req, res) => {
    await updateSettings(req.body);
    await writeAuditLog({
        actorId: req.user.id,
        action: "settings.update",
        targetType: "SiteSettings",
        targetId: "default",
        // Never write the SMTP password (even that it changed) into the audit trail.
        after: { ...req.body, smtpPassword: req.body.smtpPassword ? "[REDACTED]" : undefined },
        ip: req.ip,
    });
    res.status(204).end();
}));
adminSettingsRouter.post("/test-email", validate(sendTestEmailSchema), asyncHandler(async (req, res) => {
    await sendTestEmail(req.body.to);
    res.status(200).json({ ok: true });
}));
