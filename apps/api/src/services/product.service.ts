import type { Prisma } from "#prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import type { ProductInput } from "@smm/shared";

/** Public — active products for a given (active) brand, ascending by `level`. */
export async function listProductsPublic(brandId: string) {
  const brand = await prisma.brand.findFirst({ where: { id: brandId, isActive: true } });
  if (!brand) throw AppError.notFound("Brand not found");
  return prisma.product.findMany({
    where: { brandId, isActive: true },
    orderBy: { level: "asc" },
  });
}

export async function getProductBySlugPublic(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    include: { brand: true },
  });
  if (!product || !product.brand.isActive) throw AppError.notFound("Product not found");
  return product;
}

export async function listProductsForAdmin(page: number, pageSize: number, brandId?: string) {
  const where = brandId ? { brandId } : {};
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ brandId: "asc" }, { level: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { brand: { select: { name: true } }, _count: { select: { packages: true } } },
    }),
    prisma.product.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getProductForAdmin(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw AppError.notFound("Product not found");
  return product;
}

async function assertSlugAvailable(slug: string, excludeId?: string) {
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing && existing.id !== excludeId) {
    throw AppError.conflict("This slug is already used by another product");
  }
}

async function assertServiceExists(serviceId: string | null | undefined) {
  if (!serviceId) return;
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) throw AppError.badRequest("Unknown serviceId");
}

export async function createProduct(input: ProductInput) {
  const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
  if (!brand) throw AppError.badRequest("Unknown brandId");
  await assertSlugAvailable(input.slug);
  await assertServiceExists(input.serviceId);
  return prisma.product.create({ data: input });
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Product not found");
  if (input.slug) await assertSlugAvailable(input.slug, id);
  if (input.serviceId !== undefined) await assertServiceExists(input.serviceId);
  return prisma.product.update({ where: { id }, data: input });
}

export async function deleteProduct(id: string) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Product not found");
  await prisma.product.update({ where: { id }, data: { isActive: false } });
}

/**
 * Access Type gating (All / VIP / Reseller). VIP = User.isVip. RESELLER =
 * the admin-granted User.isReseller flag OR a self-generated reseller API
 * key (User.apiKeyHash). Both flags are admin-toggled from the User Detail
 * page and independent of the account's `role`.
 */
export function canUserAccessProduct(
  product: { accessType: string },
  user: { isVip: boolean; isReseller: boolean; apiKeyHash: string | null } | null,
): boolean {
  if (product.accessType === "ALL") return true;
  if (!user) return false;
  if (product.accessType === "VIP") return user.isVip;
  if (product.accessType === "RESELLER") return user.isReseller || !!user.apiKeyHash;
  return false;
}

/**
 * Anti-abuse order cap (Have Order Time Limit / Limited Maximum number of
 * order / Limited time duration (Hour)) — enforced here at checkout time,
 * not just in the UI, per the spec's own guardrail. Counts every order
 * placed against ANY package under this product within the rolling window.
 */
export async function assertWithinOrderLimit(
  tx: Prisma.TransactionClient,
  userId: string,
  product: { id: string; hasOrderTimeLimit: boolean; maxOrdersPerWindow: number | null; orderWindowHours: number | null },
) {
  if (!product.hasOrderTimeLimit || !product.maxOrdersPerWindow || !product.orderWindowHours) return;
  const windowStart = new Date(Date.now() - product.orderWindowHours * 60 * 60 * 1000);
  const count = await tx.order.count({
    where: { userId, createdAt: { gte: windowStart }, package: { productId: product.id } },
  });
  if (count >= product.maxOrdersPerWindow) {
    throw AppError.conflict(
      `You can only order this product ${product.maxOrdersPerWindow} time(s) every ${product.orderWindowHours}h. Please try again later.`,
    );
  }
}

/** Applies Product.removeCharacters to the buyer's raw checkout input before it's stored/submitted. */
export function sanitizeBuyerInput(raw: string, removeCharacters: string | null): string {
  if (!removeCharacters) return raw;
  let result = raw;
  for (const ch of removeCharacters) {
    result = result.split(ch).join("");
  }
  return result.trim();
}
