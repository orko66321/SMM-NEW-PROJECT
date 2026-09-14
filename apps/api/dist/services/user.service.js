import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
/**
 * Admin search boxes accept the short numeric user/order number ("1042" or
 * "#1042") alongside username/email — this pulls a clean integer out of
 * either form, or null if the search text isn't (just) a number.
 */
function parseNumericId(search) {
    const trimmed = search.trim().replace(/^#/, "");
    if (!/^\d+$/.test(trimmed))
        return null;
    const n = Number(trimmed);
    return Number.isSafeInteger(n) ? n : null;
}
export async function listUsers(page, pageSize, search, dateRange) {
    const searchAsNumber = search ? parseNumericId(search) : null;
    const where = {
        ...(search
            ? {
                OR: [
                    { username: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    ...(searchAsNumber !== null ? [{ userNumber: { equals: searchAsNumber } }] : []),
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
            userNumber: u.userNumber,
            username: u.username,
            email: u.email,
            role: u.role,
            status: u.status,
            isVip: u.isVip,
            isReseller: u.isReseller,
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
export async function updateUser(userId, actorId, input) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing)
        throw AppError.notFound("User not found");
    // An admin can't demote or suspend their own account — stops someone
    // locking themselves out with one mis-click, and makes "who removed my
    // access" always a different actor in the audit log.
    if (userId === actorId) {
        if (input.role && input.role !== existing.role) {
            throw AppError.badRequest("You can't change your own role");
        }
        if (input.status && input.status !== existing.status) {
            throw AppError.badRequest("You can't change your own account status");
        }
    }
    if ((input.role && input.role !== "ADMIN") || input.status === "SUSPENDED") {
        await assertNotLastAdmin(userId);
    }
    const updated = await prisma.user.update({ where: { id: userId }, data: input });
    return { before: existing, after: updated };
}
