import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
/** Public — active brands only, ascending by `level` (the homepage/Store sort order). */
export async function listBrandsPublic() {
    return prisma.brand.findMany({ where: { isActive: true }, orderBy: { level: "asc" } });
}
export async function getBrandPublic(id) {
    const brand = await prisma.brand.findFirst({ where: { id, isActive: true } });
    if (!brand)
        throw AppError.notFound("Brand not found");
    return brand;
}
export async function listBrandsForAdmin(page, pageSize) {
    const [items, total] = await Promise.all([
        prisma.brand.findMany({
            orderBy: { level: "asc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: { _count: { select: { products: true } } },
        }),
        prisma.brand.count(),
    ]);
    return { items, total, page, pageSize };
}
export async function getBrandForAdmin(id) {
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand)
        throw AppError.notFound("Brand not found");
    return brand;
}
export async function createBrand(input) {
    return prisma.brand.create({ data: input });
}
export async function updateBrand(id, input) {
    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing)
        throw AppError.notFound("Brand not found");
    return prisma.brand.update({ where: { id }, data: input });
}
export async function deleteBrand(id) {
    const existing = await prisma.brand.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!existing)
        throw AppError.notFound("Brand not found");
    if (existing._count.products > 0) {
        // Soft-disable rather than hard-delete when it still has products — same
        // "disable instead of destroy" convention as catalog.service.ts's deleteService.
        await prisma.brand.update({ where: { id }, data: { isActive: false } });
        return;
    }
    await prisma.brand.delete({ where: { id } });
}
