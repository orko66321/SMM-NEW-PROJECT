import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import type { CreateCategoryInput, ServiceInput } from "@smm/shared";

export async function listCategories() {
  return prisma.serviceCategory.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function createCategory(input: CreateCategoryInput) {
  return prisma.serviceCategory.create({ data: input });
}

export async function listServices(page: number, pageSize: number, categoryId?: string, search?: string) {
  const where = {
    status: "ACTIVE" as const,
    ...(categoryId ? { categoryId } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
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

export async function listServicesForAdmin(page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.service.findMany({
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.service.count(),
  ]);
  return { items, total, page, pageSize };
}

export async function createService(input: ServiceInput) {
  const category = await prisma.serviceCategory.findUnique({ where: { id: input.categoryId } });
  if (!category) throw AppError.badRequest("Unknown categoryId");
  return prisma.service.create({ data: input });
}

export async function updateService(id: string, input: Partial<ServiceInput>) {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Service not found");
  return prisma.service.update({ where: { id }, data: input });
}

export async function deleteService(id: string) {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Service not found");
  await prisma.service.update({ where: { id }, data: { status: "DISABLED" } });
}
