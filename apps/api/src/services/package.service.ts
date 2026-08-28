import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import type { PackageInput } from "@smm/shared";

const packageInclude = {
  stockPoolLinks: { include: { pool: { select: { id: true, name: true } } } },
} as const;

/** Public — every package under an (active, active-brand) product, ascending by `level`. */
export async function listPackagesPublic(productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    include: { brand: { select: { isActive: true } } },
  });
  if (!product || !product.brand.isActive) throw AppError.notFound("Product not found");
  return prisma.package.findMany({ where: { productId }, orderBy: { level: "asc" } });
}

export async function listPackagesForAdmin(page: number, pageSize: number, productId?: string) {
  const where = productId ? { productId } : {};
  const [items, total] = await Promise.all([
    prisma.package.findMany({
      where,
      orderBy: [{ productId: "asc" }, { level: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: packageInclude,
    }),
    prisma.package.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getPackageForAdmin(id: string) {
  const pkg = await prisma.package.findUnique({ where: { id }, include: packageInclude });
  if (!pkg) throw AppError.notFound("Package not found");
  return pkg;
}

async function assertPoolIdsExist(poolIds: string[]) {
  if (poolIds.length === 0) return;
  const count = await prisma.stockPool.count({ where: { id: { in: poolIds } } });
  if (count !== poolIds.length) throw AppError.badRequest("One or more stockPoolIds do not exist");
}

export async function createPackage(input: PackageInput) {
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) throw AppError.badRequest("Unknown productId");
  await assertPoolIdsExist(input.stockPoolIds);

  const { stockPoolIds, ...data } = input;
  return prisma.package.create({
    data: {
      ...data,
      stockPoolLinks: { create: stockPoolIds.map((poolId) => ({ poolId })) },
    },
    include: packageInclude,
  });
}

export async function updatePackage(id: string, input: Partial<PackageInput>) {
  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Package not found");

  const { stockPoolIds, ...data } = input;
  if (stockPoolIds) await assertPoolIdsExist(stockPoolIds);

  return prisma.$transaction(async (tx) => {
    if (stockPoolIds) {
      await tx.packageStockPool.deleteMany({ where: { packageId: id } });
      if (stockPoolIds.length > 0) {
        await tx.packageStockPool.createMany({ data: stockPoolIds.map((poolId) => ({ packageId: id, poolId })) });
      }
    }
    return tx.package.update({ where: { id }, data, include: packageInclude });
  });
}

export async function deletePackage(id: string) {
  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Package not found");
  await prisma.package.delete({ where: { id } });
}
