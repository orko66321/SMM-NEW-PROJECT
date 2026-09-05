import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
// Order statuses that count as "the order finished" for completion-time
// stats. PARTIAL is included: the order did reach a terminal delivered
// state, just under-quantity.
const COMPLETED_STATUSES = ["COMPLETED", "PARTIAL"];
const DEFAULT_AVG_SAMPLE_SIZE = 15;
export async function listCategories() {
    return prisma.serviceCategory.findMany({ orderBy: { sortOrder: "asc" } });
}
export async function createCategory(input) {
    return prisma.serviceCategory.create({ data: input });
}
// A search term matches either the name (partial, case-insensitive) or the
// provider's own product/package code (providerServiceId — exact match,
// since a code is looked up precisely, not fuzzily). This is what makes a
// bulk-imported catalog of thousands of services actually findable by the
// same code shown in the provider's own dashboard, see providerImport.service.ts.
function serviceSearchFilter(search) {
    if (!search)
        return {};
    return { OR: [{ name: { contains: search, mode: "insensitive" } }, { providerServiceId: search }] };
}
export async function listServices(page, pageSize, categoryId, search) {
    const where = {
        status: "ACTIVE",
        ...(categoryId ? { categoryId } : {}),
        ...serviceSearchFilter(search),
    };
    const [items, total] = await Promise.all([
        prisma.service.findMany({
            where,
            include: { category: { select: { name: true, platform: true } } },
            orderBy: { name: "asc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.service.count({ where }),
    ]);
    return { items, total, page, pageSize };
}
export async function listServicesForAdmin(page, pageSize, categoryId, search) {
    const where = {
        ...(categoryId ? { categoryId } : {}),
        ...serviceSearchFilter(search),
    };
    const [items, total] = await Promise.all([
        prisma.service.findMany({
            where,
            include: { category: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.service.count({ where }),
    ]);
    return { items, total, page, pageSize };
}
export async function createService(input) {
    const category = await prisma.serviceCategory.findUnique({ where: { id: input.categoryId } });
    if (!category)
        throw AppError.badRequest("Unknown categoryId");
    return prisma.service.create({ data: input });
}
export async function updateService(id, input) {
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing)
        throw AppError.notFound("Service not found");
    return prisma.service.update({ where: { id }, data: input });
}
export async function deleteService(id) {
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing)
        throw AppError.notFound("Service not found");
    await prisma.service.update({ where: { id }, data: { status: "DISABLED" } });
}
// ── Completion-time stats (SMMGen-style "Average Time") ──────────────────
/**
 * Recomputes one service's cached completion-time stats from its most recent
 * N completed orders and writes them back onto the Service row. Called from
 * order.service.ts#updateOrderStatus inside that function's transaction
 * every time one of this service's orders first enters COMPLETED/PARTIAL —
 * so the Services list and New Order page can render "Average Time"
 * instantly from the stored value, never a live aggregate on page load.
 *
 * `tx` is the caller's transaction client so the order-status flip and this
 * rollup commit atomically.
 */
export async function recomputeServiceCompletionStats(tx, serviceId) {
    const settings = await tx.siteSettings.findUnique({
        where: { id: "default" },
        select: { avgCompletionSampleSize: true },
    });
    const sampleSize = settings?.avgCompletionSampleSize ?? DEFAULT_AVG_SAMPLE_SIZE;
    const recent = await tx.order.findMany({
        where: {
            serviceId,
            status: { in: [...COMPLETED_STATUSES] },
            completionSeconds: { not: null },
            completedAt: { not: null },
        },
        orderBy: { completedAt: "desc" },
        take: sampleSize,
        select: { completionSeconds: true, completedAt: true },
    });
    if (recent.length === 0)
        return;
    const total = recent.reduce((sum, o) => sum + (o.completionSeconds ?? 0), 0);
    await tx.service.update({
        where: { id: serviceId },
        data: {
            avgCompletionSeconds: Math.round(total / recent.length),
            lastCompletedAt: recent[0].completedAt,
        },
    });
}
/**
 * Paginated history behind a service's "Recently Completed" badge — its
 * recent completed orders as anonymous rows (date, duration, quantity,
 * status only; deliberately no user/link/charge, this is a public endpoint).
 * Fetched on demand when the modal opens, never with the main services list.
 */
export async function listServiceCompletedOrders(serviceId, page, pageSize) {
    const where = {
        serviceId,
        status: { in: [...COMPLETED_STATUSES] },
        completedAt: { not: null },
    };
    const [items, total] = await Promise.all([
        prisma.order.findMany({
            where,
            orderBy: { completedAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: { id: true, completedAt: true, completionSeconds: true, quantity: true, status: true },
        }),
        prisma.order.count({ where }),
    ]);
    return { items, total, page, pageSize };
}
