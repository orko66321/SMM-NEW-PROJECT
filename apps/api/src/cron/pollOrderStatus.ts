import { logger } from "../lib/logger.js";
import { findActiveProviderOrders, updateOrderStatus } from "../services/order.service.js";
import { getProviderOrderStatusBulk, mapProviderOrderStatus } from "../services/providerClient.service.js";

/**
 * Reconciles local order status/remains against the provider's own records.
 * A provider-reported cancel/fail flows through `updateOrderStatus`, which
 * already refunds on a terminal-status transition — the same safety net
 * used for admin-initiated status changes and auto-submission failures.
 */
export async function pollOrderStatus() {
  const orders = await findActiveProviderOrders();

  const byProvider = new Map<string, typeof orders>();
  for (const order of orders) {
    const providerId = order.service?.provider?.id;
    if (!providerId || !order.providerOrderId) continue;
    const group = byProvider.get(providerId) ?? [];
    group.push(order);
    byProvider.set(providerId, group);
  }

  let updated = 0;
  for (const [, group] of byProvider) {
    const provider = group[0]!.service!.provider!;
    const ids = group.map((o) => o.providerOrderId!);

    let statuses: Record<string, { status: string; start_count?: string; remains?: string }>;
    try {
      statuses = await getProviderOrderStatusBulk(provider, ids);
    } catch (err) {
      logger.error({ err, providerId: provider.id }, "Bulk order status poll failed for provider");
      continue;
    }

    for (const order of group) {
      const remote = statuses[order.providerOrderId!];
      if (!remote) continue;
      const mapped = mapProviderOrderStatus(remote.status);
      if (mapped === "PENDING") continue; // shouldn't happen for an already-submitted order; ignore rather than regress state

      await updateOrderStatus(order.id, {
        status: mapped,
        startCount: remote.start_count !== undefined ? Number(remote.start_count) : undefined,
        remains: remote.remains !== undefined ? Number(remote.remains) : undefined,
      });
      updated += 1;
    }
  }

  return { checked: orders.length, updated };
}
