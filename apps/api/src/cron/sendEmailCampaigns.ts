import { prisma } from "../lib/prisma.js";
import { sendMail, htmlToPlainText } from "../lib/mailer.js";
import { logger } from "../lib/logger.js";

// Smaller than SMS's 50/tick — HTML emails are heavier requests, and
// Mailjet's own send API is the one actually rate-limiting these, not us.
const BATCH_SIZE = 30;
const MAX_CAMPAIGNS_PER_TICK = 5;

function renderTemplate(template: string, username: string): string {
  return template.replace(/\{\{username\}\}/g, username || "there");
}

/**
 * Advances every PENDING/SENDING EmailCampaign by one batch, same
 * cursor-via-processedCount design as cron/sendSmsCampaigns.ts — see that
 * file's header comment for the full reasoning, and EmailCampaign's model
 * comment in schema.prisma for why recipientEmails/recipientUsernames are
 * parallel arrays (per-recipient {{username}} personalization).
 */
export async function sendEmailCampaigns() {
  const campaigns = await prisma.emailCampaign.findMany({
    where: { status: { in: ["PENDING", "SENDING"] } },
    orderBy: { createdAt: "asc" },
    take: MAX_CAMPAIGNS_PER_TICK,
  });

  let batchesSent = 0;
  let messagesSent = 0;

  for (const campaign of campaigns) {
    const batchEmails = campaign.recipientEmails.slice(campaign.processedCount, campaign.processedCount + BATCH_SIZE);
    const batchUsernames = campaign.recipientUsernames.slice(campaign.processedCount, campaign.processedCount + BATCH_SIZE);
    if (batchEmails.length === 0) {
      await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      continue;
    }

    let success = 0;
    let failed = 0;
    for (let i = 0; i < batchEmails.length; i += 1) {
      const email = batchEmails[i]!;
      const username = batchUsernames[i] ?? "";
      try {
        const subject = renderTemplate(campaign.subject, username);
        const html = renderTemplate(campaign.bodyHtml, username);
        await sendMail(email, subject, htmlToPlainText(html), html);
        success += 1;
      } catch (err) {
        failed += 1;
        logger.warn({ err, campaignId: campaign.id, email }, "Campaign email failed for one recipient");
      }
    }

    const processedCount = campaign.processedCount + batchEmails.length;
    const done = processedCount >= campaign.recipientCount;
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: {
        processedCount,
        successCount: { increment: success },
        failedCount: { increment: failed },
        status: done ? "COMPLETED" : "SENDING",
        ...(done ? { completedAt: new Date() } : {}),
      },
    });

    batchesSent += 1;
    messagesSent += batchEmails.length;
  }

  return { campaignsAdvanced: batchesSent, messagesSent };
}
