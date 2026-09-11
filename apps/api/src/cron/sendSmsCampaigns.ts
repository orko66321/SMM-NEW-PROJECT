import { prisma } from "../lib/prisma.js";
import { sendSms } from "../lib/sms.js";
import { logger } from "../lib/logger.js";

// How many recipients one tick sends for one campaign — keeps a single tick
// fast regardless of campaign size (a 5,000-recipient broadcast takes ~100
// ticks instead of one long-running call), and stays comfortably inside
// uronto SMS's per-request nature (one GET per recipient, no bulk endpoint).
const BATCH_SIZE = 50;
// How many in-progress campaigns one tick advances — almost always 0 or 1
// in practice, but caps the worst case if several were queued back to back.
const MAX_CAMPAIGNS_PER_TICK = 5;

/**
 * Advances every PENDING/SENDING SmsCampaign by one batch of up to
 * BATCH_SIZE recipients, using `processedCount` as the cursor into the
 * `recipients` snapshot (see that model's comment in schema.prisma).
 * A campaign that still has recipients left after this tick stays
 * SENDING for the next one; the last tick to exhaust `recipients` marks
 * it COMPLETED. Never marks a campaign FAILED for a per-recipient send
 * failure — those just count against `failedCount`, same "partial success
 * is still success" treatment order.service.ts gives a partially-delivered
 * order.
 */
export async function sendSmsCampaigns() {
  const campaigns = await prisma.smsCampaign.findMany({
    where: { status: { in: ["PENDING", "SENDING"] } },
    orderBy: { createdAt: "asc" },
    take: MAX_CAMPAIGNS_PER_TICK,
  });

  let batchesSent = 0;
  let messagesSent = 0;

  for (const campaign of campaigns) {
    const batch = campaign.recipients.slice(campaign.processedCount, campaign.processedCount + BATCH_SIZE);
    if (batch.length === 0) {
      // Nothing left to send (can happen if recipientCount and
      // recipients.length ever disagree) — close it out rather than loop
      // on it forever.
      await prisma.smsCampaign.update({
        where: { id: campaign.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      continue;
    }

    let success = 0;
    let failed = 0;
    for (const phone of batch) {
      try {
        await sendSms(phone, campaign.message);
        success += 1;
      } catch (err) {
        failed += 1;
        logger.warn({ err, campaignId: campaign.id, phone }, "Campaign SMS failed for one recipient");
      }
    }

    const processedCount = campaign.processedCount + batch.length;
    const done = processedCount >= campaign.recipientCount;
    await prisma.smsCampaign.update({
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
    messagesSent += batch.length;
  }

  return { campaignsAdvanced: batchesSent, messagesSent };
}
