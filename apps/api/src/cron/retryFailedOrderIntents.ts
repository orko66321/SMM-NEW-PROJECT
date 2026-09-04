import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { fulfillOrderIntent } from "../services/order.service.js";
import { fulfillStorePackageIntent } from "../services/store.service.js";

/**
 * Self-heals a paid-but-unplaced order. deposit.service.ts's
 * confirmGatewayDeposit NEVER lets an order-placement failure roll back an
 * already-confirmed payment — the deposit is APPROVED and the wallet
 * credited regardless — but that means a transient placement failure right
 * at confirm time (a stock pool momentarily empty, a passing provider
 * timeout, a brief DB hiccup) otherwise just sits there as a FAILED
 * OrderIntent forever, with the customer's money safely in their wallet but
 * no order and no automatic retry. This is exactly the "paid orders stuck
 * needing manual admin approval" symptom for ZiniPay checkout — Add Fund
 * deposits never hit this path at all since they carry no OrderIntent.
 *
 * Retried every tick for as long as the intent hasn't expired (same 30-
 * minute window used to create it); past that it's left FAILED for an admin
 * to resolve (or the customer to re-order) by hand — never re-charged,
 * never silently dropped, the money stays exactly where it is either way.
 */
export async function retryFailedOrderIntents() {
  const candidates = await prisma.orderIntent.findMany({
    where: {
      status: "FAILED",
      expiresAt: { gt: new Date() },
      // Only ever retry an intent that was actually paid for — never touch
      // one that failed before any money moved (that's just an ordinary
      // rejected order, nothing to self-heal).
      deposits: { some: { status: "APPROVED" } },
    },
    take: 100,
  });

  let retried = 0;
  for (const intent of candidates) {
    try {
      await prisma.$transaction(async (tx) => {
        // Row-locked + re-checked exactly like confirmGatewayDeposit's own
        // deposit lock — guards against this same intent being retried by
        // two overlapping cron ticks, or a webhook/callback resolving it
        // concurrently.
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "OrderIntent" WHERE "id" = ${intent.id} FOR UPDATE
        `;
        if (!locked[0]) return;
        const current = await tx.orderIntent.findUniqueOrThrow({ where: { id: intent.id } });
        if (current.status !== "FAILED") return; // already resolved since we listed it

        if (current.kind === "PACKAGE") {
          await fulfillStorePackageIntent(tx, current);
        } else {
          await fulfillOrderIntent(tx, current);
        }
      });
      retried += 1;
    } catch (err) {
      // fulfillOrderIntent/fulfillStorePackageIntent are themselves written
      // to never throw — this only fires for something breaking the retry
      // machinery itself (e.g. the row lock). Logged loudly either way so a
      // permanently-stuck intent is diagnosable, not silently forgotten.
      logger.error({ err, orderIntentId: intent.id }, "Retrying a failed order intent threw unexpectedly");
    }
  }

  return { checked: candidates.length, retried };
}
