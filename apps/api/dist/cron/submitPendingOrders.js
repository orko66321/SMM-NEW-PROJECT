import { logger } from "../lib/logger.js";
import { findPendingAutoSubmitOrders, markOrderSubmittedToProvider, updateOrderStatus } from "../services/order.service.js";
import { submitProviderOrder } from "../services/providerClient.service.js";
/**
 * Auto-submits PENDING orders on `autoSubmit`-enabled services to their
 * provider. Tries the primary provider, then the service's backup provider
 * once if the primary fails; if both fail (or there is no backup), the
 * order is marked FAILED, which atomically refunds the customer via
 * `updateOrderStatus`'s existing refund-on-terminal-status logic — a
 * broken provider integration can never silently keep a customer's money.
 */
export async function submitPendingOrders() {
    const orders = await findPendingAutoSubmitOrders();
    for (const order of orders) {
        const { service } = order;
        const candidates = [service.provider, service.backupProvider].filter((p) => !!p);
        if (candidates.length === 0) {
            logger.warn({ orderId: order.id, serviceId: service.id }, "autoSubmit service has no provider configured");
            continue;
        }
        let submitted = null;
        let lastError;
        for (const provider of candidates) {
            if (!service.providerServiceId) {
                lastError = new Error("Service has no providerServiceId mapping");
                break;
            }
            try {
                submitted = await submitProviderOrder(provider, {
                    service: service.providerServiceId,
                    link: order.link,
                    quantity: order.quantity,
                });
                break;
            }
            catch (err) {
                lastError = err;
                logger.warn({ err, orderId: order.id, providerId: provider.id }, "Provider order submission failed, trying next candidate if any");
            }
        }
        if (submitted) {
            await markOrderSubmittedToProvider(order.id, submitted);
            logger.info({ orderId: order.id, providerOrderId: submitted }, "Order auto-submitted to provider");
        }
        else {
            logger.error({ orderId: order.id, err: lastError }, "Order auto-submission exhausted all providers — marking FAILED and refunding");
            await updateOrderStatus(order.id, { status: "FAILED" });
        }
    }
    return { processed: orders.length };
}
