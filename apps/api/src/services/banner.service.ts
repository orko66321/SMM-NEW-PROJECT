import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import type { BannerInput } from "@smm/shared";

/** Public — every banner, ascending by `order` (the display sequence), for <BannerSlider />. */
export async function listBannersPublic() {
  return prisma.banner.findMany({ orderBy: { order: "asc" } });
}

export async function listBannersForAdmin(page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.banner.findMany({
      orderBy: { order: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.banner.count(),
  ]);
  return { items, total, page, pageSize };
}

export async function createBanner(input: BannerInput) {
  return prisma.banner.create({ data: input });
}

export async function updateBanner(id: string, input: Partial<BannerInput>) {
  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Banner not found");
  return prisma.banner.update({ where: { id }, data: input });
}

export async function deleteBanner(id: string): Promise<void> {
  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Banner not found");
  await prisma.banner.delete({ where: { id } });
}
