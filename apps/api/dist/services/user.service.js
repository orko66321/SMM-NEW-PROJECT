import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
export async function listUsers(page, pageSize, search, dateRange) {
    const where = {
        ...(search
            ? {
                OR: [
                    { username: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                ],
            }
            : {}),
        ...(dateRange?.from || dateRange?.to
            ? { createdAt: { ...(dateRange.from ? { gte: dateRange.from } : {}), ...(dateRange.to ? { lt: dateRange.to } : {}) } }
            : {}),
    };
    const [items, total] = await Promise.all([
        prisma.user.findMany({
            where,
            include: {
                wallet: { select: { balance: true } },
                _count: { select: { orders: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.user.count({ where }),
    ]);
    return {
        items: items.map((u) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role,
            status: u.status,
            balance: u.wallet?.balance.toString() ?? "0",
            ordersCount: u._count.orders,
            createdAt: u.createdAt.toISOString(),
        })),
        total,
        page,
        pageSize,
    };
}
export async function getUserDetail(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallet: true, _count: { select: { orders: true, tickets: true } } },
    });
    if (!user)
        throw AppError.notFound("User not found");
    return user;
}
// Prevents an admin from locking themselves (or the last remaining admin)
// out of the panel by demoting/suspending the only ADMIN account.
async function assertNotLastAdmin(userId) {
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (target?.role !== "ADMIN")
        return;
    const adminCount = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
    if (adminCount <= 1) {
        throw AppError.badRequest("Cannot demote or suspend the last remaining active admin");
    }
}
export async function updateUser(userId, input) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing)
        throw AppError.notFound("User not found");
    if ((input.role && input.role !== "ADMIN") || input.status === "SUSPENDED") {
        await assertNotLastAdmin(userId);
    }
    const updated = await prisma.user.update({ where: { id: userId }, data: input });
    return { before: existing, after: updated };
}
