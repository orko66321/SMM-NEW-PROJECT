import { Router } from "express";
import { SupportChannelTypeValues, supportChannelUpdateSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";
import { listSupportChannelsForAdmin, updateSupportChannel } from "../../services/supportChannel.service.js";
import { writeAuditLog } from "../../services/audit.service.js";
export const adminSupportChannelsRouter = Router();
adminSupportChannelsRouter.get("/", asyncHandler(async (_req, res) => {
    res.json({ items: await listSupportChannelsForAdmin() });
}));
adminSupportChannelsRouter.put("/:type", validate(supportChannelUpdateSchema), asyncHandler(async (req, res) => {
    const type = req.params.type;
    if (!SupportChannelTypeValues.includes(type))
        throw AppError.notFound("Unknown support channel");
    const channel = await updateSupportChannel(type, req.body);
    await writeAuditLog({
        actorId: req.user.id,
        action: "supportChannel.update",
        targetType: "SupportChannel",
        targetId: type,
        after: { enabled: channel.enabled, value: channel.value, label: channel.label, sortOrder: channel.sortOrder },
        ip: req.ip,
    });
    res.json({ channel });
}));
