import { Router } from "express";
import { createSmsCampaignSchema, paginationQuerySchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createCampaign, getAudienceCounts, getSmsBalance, listCampaigns } from "../../services/smsCampaign.service.js";
import { writeAuditLog } from "../../services/audit.service.js";
export const adminSmsRouter = Router();
adminSmsRouter.get("/balance", asyncHandler(async (_req, res) => {
    res.json(await getSmsBalance());
}));
adminSmsRouter.get("/audience-counts", asyncHandler(async (_req, res) => {
    res.json(await getAudienceCounts());
}));
adminSmsRouter.get("/campaigns", validate(paginationQuerySchema, "query"), asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query;
    res.json(await listCampaigns(page, pageSize));
}));
adminSmsRouter.post("/campaigns", validate(createSmsCampaignSchema), asyncHandler(async (req, res) => {
    const campaign = await createCampaign(req.user.id, req.body);
    // customNumbers can be a very long list — never worth writing into the
    // audit trail verbatim; the campaign row itself is the permanent record.
    await writeAuditLog({
        actorId: req.user.id,
        action: "sms_campaign.create",
        targetType: "SmsCampaign",
        targetId: campaign.id,
        after: {
            title: campaign.title,
            targetGroup: campaign.targetGroup,
            recipientCount: campaign.recipientCount,
            totalSmsUnits: campaign.totalSmsUnits,
        },
        ip: req.ip,
    });
    res.status(201).json(campaign);
}));
