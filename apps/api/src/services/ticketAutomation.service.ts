import type { TicketActionKey } from "@smm/shared";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import {
  cancelOrderForUser,
  peekProviderStatus,
  prioritizeOrderForUser,
  refreshOrderFromProvider,
  requestRefill,
} from "./order.service.js";

/**
 * The "AI Support" automated resolution engine (build spec §4).
 *
 * "AI" here means rule-based, not a model: an AI Support ticket carries
 * exactly the structured data (which order, which action) needed to resolve
 * it against the provider API. This runs once per AI Support submission —
 * both the initial ticket and any AI Support reply on the thread — and:
 *
 *   1. dispatches per subcategory actionKey, for each already-ownership-checked order
 *   2. records a per-order TicketOrderAction audit row
 *   3. appends a SYSTEM TicketMessage summarising what happened per order
 *   4. escalates the whole ticket to the human queue if ANY action is not a
 *      clean success
 *
 * Order ownership is verified by the caller (ticket.service.ts parseOrderIds)
 * AND again here via order.service's `*ForUser` helpers — never trust a stale
 * ticket.orderIds array alone.
 */

type PerOrderOutcome = {
  result: "SUCCESS" | "FAILED" | "NOT_ELIGIBLE" | "ESCALATED";
  detail: string;
};

async function handleOrder(
  userId: string,
  actionKey: TicketActionKey,
  orderId: string,
): Promise<PerOrderOutcome> {
  try {
    switch (actionKey) {
      case "REFILL": {
        const refill = await requestRefill(userId, orderId);
        return {
          result: "SUCCESS",
          detail:
            refill.status === "IN_PROGRESS"
              ? `Refill requested with the provider — we'll update this ticket when it completes.`
              : `Refill request queued — our team will process it shortly.`,
        };
      }

      case "CANCEL": {
        await cancelOrderForUser(userId, orderId);
        return {
          result: "SUCCESS",
          detail: `Order canceled and the charge refunded to your wallet.`,
        };
      }

      case "SPEED_UP": {
        await prioritizeOrderForUser(userId, orderId);
        return {
          result: "SUCCESS",
          detail: `We've flagged this order for priority review — typical resolution 5–45 minutes. This is an estimate, not a guarantee.`,
        };
      }

      case "RESTART": {
        const { providerStatus } = await refreshOrderFromProvider(userId, orderId);
        return {
          result: "SUCCESS",
          detail: `Re-checked with the provider — current status: ${providerStatus}. If it stays stuck we'll escalate to a human.`,
        };
      }

      case "FAKE_COMPLETE":
      case "OTHER":
      default: {
        // Inherently a dispute / not confidently auto-resolvable — fetch the
        // latest provider status so the agent doesn't have to, then escalate.
        const providerStatus = await peekProviderStatus(userId, orderId);
        return {
          result: "ESCALATED",
          detail: providerStatus
            ? `Provider currently reports: ${providerStatus}. Sending this to a human agent to review.`
            : `Sending this to a human agent to review.`,
        };
      }
    }
  } catch (err) {
    if (err instanceof AppError) {
      // Eligibility failures (refill window expired, order already completed,
      // service doesn't support the action, no provider to act on) — needs a
      // human, but with a specific reason the customer can see.
      return { result: "NOT_ELIGIBLE", detail: err.message };
    }
    return { result: "FAILED", detail: "The provider request failed — a human will take over." };
  }
}

export async function runTicketAutomation(params: {
  ticketId: string;
  userId: string;
  actionKey: TicketActionKey;
  orderIds: string[];
}): Promise<{ escalated: boolean }> {
  const { ticketId, userId, actionKey, orderIds } = params;
  const lines: string[] = [];
  let allClean = orderIds.length > 0;

  for (const orderId of orderIds) {
    const outcome = await handleOrder(userId, actionKey, orderId);
    if (outcome.result !== "SUCCESS") allClean = false;

    await prisma.ticketOrderAction.create({
      data: {
        ticketId,
        orderId,
        actionKey,
        result: outcome.result,
        detail: outcome.detail,
      },
    });

    lines.push(`• Order #${orderId}: ${outcome.detail}`);
  }

  const escalated = !allClean;
  const header = escalated
    ? `Some items on this ticket need a human — a support agent will follow up here.`
    : `All items on this ticket have been handled automatically.`;

  await prisma.$transaction(async (tx) => {
    await tx.ticketMessage.create({
      data: {
        ticketId,
        senderId: null,
        senderRole: "SYSTEM",
        body: [header, "", ...lines].join("\n"),
      },
    });
    await tx.ticket.update({
      where: { id: ticketId },
      data: { status: escalated ? "ESCALATED" : "RESOLVED", updatedAt: new Date() },
    });
  });

  return { escalated };
}
