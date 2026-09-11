import { computeSmsSegments } from "@smm/shared";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { normalizeBdPhone, isSmsConfigured, getSmsBalance as fetchSmsBalance } from "../lib/sms.js";
/**
 * Resolves a target group to a deduped list of normalized recipient phone
 * numbers. ALL/VIP/RESELLER always read live from User.phone (only rows
 * that actually have one); CUSTOM uses exactly what the admin submitted
 * (already BD-regex-validated by createSmsCampaignSchema). The result is
 * what gets snapshotted onto SmsCampaign.recipients — see that model's
 * comment in schema.prisma for why a snapshot, not a live query, drives
 * the actual send.
 */
async function resolveRecipients(targetGroup, customNumbers) {
    if (targetGroup === "CUSTOM") {
        return Array.from(new Set((customNumbers ?? []).map(normalizeBdPhone)));
    }
    const where = targetGroup === "VIP"
        ? { isVip: true, phone: { not: null } }
        : targetGroup === "RESELLER"
            ? { isReseller: true, phone: { not: null } }
            : { phone: { not: null } };
    const users = await prisma.user.findMany({ where, select: { phone: true } });
    return Array.from(new Set(users.map((u) => normalizeBdPhone(u.phone))));
}
/** Powers the composer's live "Total Targetable Users" count per radio selection — CUSTOM doesn't query anything, the frontend counts what's typed. */
export async function getAudienceCounts() {
    const [all, vip, reseller] = await Promise.all([
        prisma.user.count({ where: { phone: { not: null } } }),
        prisma.user.count({ where: { isVip: true, phone: { not: null } } }),
        prisma.user.count({ where: { isReseller: true, phone: { not: null } } }),
    ]);
    return { all, vip, reseller };
}
export async function getSmsBalance() {
    return fetchSmsBalance();
}
/**
 * Creates a campaign row and returns immediately — the actual sending is
 * cron-driven (cron/sendSmsCampaigns.ts) in fixed-size batches, since
 * mailing potentially thousands of recipients one HTTP call at a time to
 * uronto SMS can't happen inside a single request/response cycle. Status
 * starts PENDING; the cron flips it to SENDING on its first batch and
 * COMPLETED once `processedCount` reaches `recipientCount`.
 */
export async function createCampaign(sentById, input) {
    if (!(await isSmsConfigured())) {
        throw AppError.badRequest("SMS isn't configured — enable it and save an API key under Settings → SMS Notifications first");
    }
    const recipients = await resolveRecipients(input.targetGroup, input.customNumbers);
    if (recipients.length === 0) {
        throw AppError.badRequest("No recipients match this audience — nothing to send");
    }
    const segments = computeSmsSegments(input.message);
    return prisma.smsCampaign.create({
        data: {
            title: input.title,
            message: input.message,
            targetGroup: input.targetGroup,
            recipients,
            recipientCount: recipients.length,
            smsUnitsPerRecipient: segments.segments,
            totalSmsUnits: segments.segments * recipients.length,
            sentById,
        },
    });
}
export async function listCampaigns(page, pageSize) {
    const [items, total] = await Promise.all([
        prisma.smsCampaign.findMany({
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
                id: true,
                title: true,
                targetGroup: true,
                recipientCount: true,
                totalSmsUnits: true,
                processedCount: true,
                successCount: true,
                failedCount: true,
                status: true,
                createdAt: true,
                completedAt: true,
                sentBy: { select: { username: true } },
            },
        }),
        prisma.smsCampaign.count(),
    ]);
    return { items, total, page, pageSize };
}
