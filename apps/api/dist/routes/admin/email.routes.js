import { Router } from "express";
import { createEmailCampaignSchema, paginationQuerySchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createCampaign, getEmailAudienceCounts, listCampaigns } from "../../services/emailCampaign.service.js";
import { writeAuditLog } from "../../services/audit.service.js";
export const adminEmailRouter = Router();
adminEmailRouter.get("/audience-counts", asyncHandler(async (_req, res) => {
    res.json(await getEmailAudienceCounts());
}));
adminEmailRouter.get("/campaigns", validate(paginationQuerySchema, "query"), asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query;
    res.json(await listCampaigns(page, pageSize));
}));
adminEmailRouter.post("/campaigns", validate(createEmailCampaignSchema), asyncHandler(async (req, res) => {
    const campaign = await createCampaign(req.user.id, req.body);
    // bodyHtml/customEmails can be very long — never worth writing into the
    // audit trail verbatim; the campaign row itself is the permanent record.
    await writeAuditLog({
        actorId: req.user.id,
        action: "email_campaign.create",
        targetType: "EmailCampaign",
        targetId: campaign.id,
        after: {
            title: campaign.title,
            subject: campaign.subject,
            targetGroup: campaign.targetGroup,
            recipientCount: campaign.recipientCount,
        },
        ip: req.ip,
    });
    res.status(201).json(campaign);
}));
