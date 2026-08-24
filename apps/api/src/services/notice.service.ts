import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import type { NoticeInput } from "@smm/shared";

export async function listNoticesForAdmin() {
  return prisma.notice.findMany({ orderBy: { createdAt: "desc" } });
}

/** Public — active, and (if set) within its start/end window. */
export async function listActiveNotices() {
  const now = new Date();
  return prisma.notice.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createNotice(input: NoticeInput) {
  return prisma.notice.create({ data: input });
}

export async function updateNotice(id: string, input: Partial<NoticeInput>) {
  const existing = await prisma.notice.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Notice not found");
  return prisma.notice.update({ where: { id }, data: input });
}

export async function deleteNotice(id: string): Promise<void> {
  const existing = await prisma.notice.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Notice not found");
  await prisma.notice.delete({ where: { id } });
}
