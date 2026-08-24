import { logger } from "../lib/logger.js";
import { findPollableRefills, updateRefillStatus } from "../services/order.service.js";
import { getProviderRefillStatus, mapProviderRefillStatus } from "../services/providerClient.service.js";
/**
 * Reconciles provider-submitted refills (IN_PROGRESS, has a providerRefillId)
 * against the provider's own records — same per-provider grouping and
 * "log and skip on failure" shape as cron/pollOrderStatus.ts, just for
 * refills instead of orders.
 */
export async function pollRefillStatus() {
    const refills = await findPollableRefills();
    let updated = 0;
    for (const refill of refills) {
        const provider = refill.order.service.provider;
        if (!provider || !refill.providerRefillId)
            continue;
        let remote;
        try {
            remote = await getProviderRefillStatus(provider, refill.providerRefillId);
        }
        catch (err) {
            logger.error({ err, refillId: refill.id, providerId: provider.id }, "Refill status poll failed");
            continue;
        }
        const mapped = mapProviderRefillStatus(remote.status);
        if (mapped === "IN_PROGRESS")
            continue; // no change — still in progress
        await updateRefillStatus(refill.id, mapped);
        updated += 1;
    }
    return { checked: refills.length, updated };
}
