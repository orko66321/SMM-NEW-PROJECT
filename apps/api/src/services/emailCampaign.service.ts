import type { CreateEmailCampaignInput } from "@smm/shared";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { isMailConfigured } from "../lib/mailer.js";
import { isEmailBroadcastEnabled } from "./settings.service.js";

interface Recipient {
  email: string;
  username: string;
}

/**
 * Resolves a target group to a deduped list of {email, username} pairs —
 * `username` drives cron/sendEmailCampaigns.ts's per-recipient
 * {{username}} personalization (see EmailCampaign's model comment in
 * schema.prisma). ALL/VIP/RESELLER always read live from the User table
 * (every user has an email — unlike SMS's optional phone, there's no
 * "missing contact info" case to filter out here); CUSTOM is whatever the
 * admin pasted in, cross-referenced against User so an address that
 * happens to belong to a real account still gets personalized.
 */
async function resolveRecipients(
  targetGroup: CreateEmailCampaignInput["targetGroup"],
  customEmails: string[] | undefined,
): Promise<Recipient[]> {
  if (targetGroup === "CUSTOM") {
    const emails = Array.from(new Set(customEmails ?? []));
    const known = await prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true, username: true } });
    const usernameByEmail = new Map(known.map((u) => [u.email, u.username]));
    return emails.map((email) => ({ email, username: usernameByEmail.get(email) ?? "" }));
  }
  const where = targetGroup === "VIP" ? { isVip: true } : targetGroup === "RESELLER" ? { isReseller: true } : {};
  const users = await prisma.user.findMany({ where, select: { email: true, username: true } });
  return users.map((u) => ({ email: u.email, username: u.username }));
}

/** Powers the composer's live "Total Targetable Users" count per radio selection — CUSTOM doesn't query anything, the frontend counts what's typed. */
export async function getEmailAudienceCounts(): Promise<{ all: number; vip: number; reseller: number }> {
  const [all, vip, reseller] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isVip: true } }),
    prisma.user.count({ where: { isReseller: true } }),
  ]);
  return { all, vip, reseller };
}

/**
 * Creates a campaign row and returns immediately — the actual sending is
 * cron-driven (cron/sendEmailCampaigns.ts) in fixed-size batches, same
 * shape as smsCampaign.service.ts's createCampaign. Gated by BOTH the
 * Bulk Email master switch (emailBroadcastEnabled) and email being
 * configured at all (isMailConfigured) — a misconfigured/disabled sender
 * fails the request up front instead of quietly queuing a campaign that
 * will never actually send.
 */
export async function createCampaign(sentById: string, input: CreateEmailCampaignInput) {
  if (!(await isEmailBroadcastEnabled())) {
    throw AppError.badRequest("Bulk email is turned off — enable it in the Bulk Email tab first");
  }
  if (!(await isMailConfigured())) {
    throw AppError.badRequest("Email isn't configured — set up Mailjet under Settings → Site Settings first");
  }

  const recipients = await resolveRecipients(input.targetGroup, input.customEmails);
  if (recipients.length === 0) {
    throw AppError.badRequest("No recipients match this audience — nothing to send");
  }

  return prisma.emailCampaign.create({
    data: {
      title: input.title,
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      targetGroup: input.targetGroup,
      recipientEmails: recipients.map((r) => r.email),
      recipientUsernames: recipients.map((r) => r.username),
      recipientCount: recipients.length,
      sentById,
    },
  });
}

export async function listCampaigns(page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.emailCampaign.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        subject: true,
        targetGroup: true,
        recipientCount: true,
        processedCount: true,
        successCount: true,
        failedCount: true,
        status: true,
        createdAt: true,
        completedAt: true,
        sentBy: { select: { username: true } },
      },
    }),
    prisma.emailCampaign.count(),
  ]);
  return { items, total, page, pageSize };
}
