import { prisma } from "../lib/prisma.js";
import { encrypt } from "../lib/crypto.js";
import { AppError } from "../utils/AppError.js";
import { getProviderOrThrow, listProviderServices } from "./providerClient.service.js";
// Never select apiKeyCiphertext into anything returned to a client — these
// are the fields every provider-facing response is built from.
const PROVIDER_SAFE_SELECT = {
    id: true,
    name: true,
    apiUrl: true,
    balance: true,
    status: true,
    lastSyncAt: true,
    createdAt: true,
    updatedAt: true,
};
export async function listProviders() {
    const providers = await prisma.provider.findMany({ select: PROVIDER_SAFE_SELECT, orderBy: { createdAt: "desc" } });
    return providers.map((p) => ({ ...p, balance: p.balance.toString() }));
}
export async function createProvider(input) {
    const provider = await prisma.provider.create({
        data: { name: input.name, apiUrl: input.apiUrl, apiKeyCiphertext: encrypt(input.apiKey) },
        select: PROVIDER_SAFE_SELECT,
    });
    return { ...provider, balance: provider.balance.toString() };
}
export async function updateProvider(id, input) {
    const existing = await prisma.provider.findUnique({ where: { id } });
    if (!existing)
        throw AppError.notFound("Provider not found");
    const provider = await prisma.provider.update({
        where: { id },
        data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.apiUrl !== undefined ? { apiUrl: input.apiUrl } : {}),
            ...(input.apiKey !== undefined ? { apiKeyCiphertext: encrypt(input.apiKey) } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
        },
        select: PROVIDER_SAFE_SELECT,
    });
    return { ...provider, balance: provider.balance.toString() };
}
/**
 * A provider with any Service mapped to it (as primary or backup) can't be
 * hard-deleted — same "disable/reassign instead" pattern as
 * paymentMethod.service.ts's deletePaymentMethod and coupon.service.ts's
 * deleteCoupon, for the same reason: those Service rows would otherwise be
 * orphaned (auto-fulfillment pointing at a provider that no longer exists).
 * ProviderSyncLog rows cascade-delete automatically (see schema.prisma).
 */
export async function deleteProvider(id) {
    const existing = await prisma.provider.findUnique({
        where: { id },
        include: { _count: { select: { services: true, backupServices: true } } },
    });
    if (!existing)
        throw AppError.notFound("Provider not found");
    if (existing._count.services > 0 || existing._count.backupServices > 0) {
        throw AppError.conflict("This provider has services mapped to it — reassign or delete those services first, or disable the provider instead");
    }
    await prisma.provider.delete({ where: { id } });
}
export async function listProviderSyncLogs(providerId, limit = 50) {
    return prisma.providerSyncLog.findMany({
        where: { providerId },
        orderBy: { createdAt: "desc" },
        take: limit,
    });
}
/**
 * Pulls the provider's catalog and updates `providerCostPer1000` /
 * availability on services already mapped to it by `providerServiceId`.
 * Deliberately never touches `sellPricePer1000` — the admin's margin is the
 * admin's decision, sync only keeps the *cost* side accurate.
 */
export async function syncProviderCatalog(providerId) {
    const provider = await getProviderOrThrow(providerId);
    const remoteServices = await listProviderServices(provider);
    const remoteById = new Map(remoteServices.map((s) => [s.service, s]));
    const mappedServices = await prisma.service.findMany({
        where: { providerId, providerServiceId: { not: null } },
    });
    let updated = 0;
    for (const local of mappedServices) {
        const remote = local.providerServiceId ? remoteById.get(local.providerServiceId) : undefined;
        if (!remote)
            continue;
        const rate = Number(remote.rate);
        if (!Number.isFinite(rate))
            continue;
        await prisma.service.update({
            where: { id: local.id },
            data: { providerCostPer1000: rate },
        });
        updated += 1;
    }
    await prisma.provider.update({ where: { id: providerId }, data: { lastSyncAt: new Date() } });
    return { remoteCount: remoteServices.length, updatedCount: updated };
}
