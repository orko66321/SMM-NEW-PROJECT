import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { confirmGatewayDeposit } from "../services/deposit.service.js";
import { gatewayRegistry } from "../services/payments/registry.js";
import { getEnabledGatewayCredentials, getGatewayAutoVerify } from "../services/payments/config.service.js";
import type { PaymentGatewayKey } from "@smm/shared";

const STALE_AFTER_MS = 3 * 60 * 1000;

/**
 * Covers the gap where a customer completes payment on the gateway's page
 * but closes the tab / loses connectivity before the browser redirect back
 * to our callback route completes — without this, that deposit would stay
 * PENDING forever even though the customer was actually charged.
 */
export async function reconcilePendingDeposits() {
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS);
  const pending = await prisma.deposit.findMany({
    where: { status: "PENDING", gatewayRef: { not: null }, gatewayProvider: { not: null }, createdAt: { lt: staleBefore } },
    take: 100,
  });

  let confirmed = 0;
  for (const deposit of pending) {
    const key = deposit.gatewayProvider as PaymentGatewayKey;
    const adapter = gatewayRegistry[key];
    if (!adapter) continue;

    try {
      const credentials = await getEnabledGatewayCredentials(key);
      const autoVerify = await getGatewayAutoVerify(key);
      const result = await adapter.confirm(credentials, deposit.gatewayRef!);
      if (result.status !== "PENDING") {
        await confirmGatewayDeposit(deposit.gatewayRef!, { status: result.status, gatewayProvider: key }, { autoVerify });
        confirmed += 1;
      }
    } catch (err) {
      logger.error({ err, depositId: deposit.id }, "Deposit reconciliation failed");
    }
  }

  return { checked: pending.length, confirmed };
}
