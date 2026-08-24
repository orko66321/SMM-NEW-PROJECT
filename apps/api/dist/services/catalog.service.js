import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
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
