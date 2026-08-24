import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { syncProviderCatalog } from "../services/providers.service.js";
/** Periodic counterpart to the admin-triggered `POST /api/admin/providers/:id/sync`. */
export async function syncAllActiveProviders() {
    const providers = await prisma.provider.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
    for (const provider of providers) {
        try {
            await syncProviderCatalog(provider.id);
        }
        catch (err) {
            logger.error({ err, providerId: provider.id }, "Scheduled provider catalog sync failed");
        }
    }
    return { providerCount: providers.length };
}
