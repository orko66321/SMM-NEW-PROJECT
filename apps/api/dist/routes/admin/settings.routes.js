import { Router } from "express";
import { sendTestEmailSchema, sendTestSmsSchema, updateSettingsSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getAdminSettings, sendTestEmail, sendTestSms, updateSettings } from "../../services/settings.service.js";
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
        // Never write the SMTP password (even that it changed) into the audit
        // trail; collapse the base64 image blobs to a marker so the log stays
        // small and readable.
        after: {
            ...req.body,
            smtpPassword: req.body.smtpPassword ? "[REDACTED]" : undefined,
            smsApiKey: req.body.smsApiKey ? "[REDACTED]" : undefined,
            ...Object.fromEntries(["mainLogo", "walletLogo", "autoPayLogo", "icon512", "icon192", "icon512Alt"]
                .filter((k) => req.body[k] !== undefined)
                .map((k) => [k, req.body[k] ? "[image]" : null])),
        },
        ip: req.ip,
    });
    res.status(204).end();
}));
adminSettingsRouter.post("/test-email", validate(sendTestEmailSchema), asyncHandler(async (req, res) => {
    await sendTestEmail(req.body.to);
    res.status(200).json({ ok: true });
}));
adminSettingsRouter.post("/test-sms", validate(sendTestSmsSchema), asyncHandler(async (req, res) => {
    await sendTestSms(req.body.to);
    res.status(200).json({ ok: true });
}));
