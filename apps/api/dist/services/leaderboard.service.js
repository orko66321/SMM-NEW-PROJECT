import { prisma } from "../lib/prisma.js";
// Real top-spenders ranking, replacing the frontend's placeholder data (see
// apps/web/src/components/leaderboard/types.ts). "Spend" = lifetime charge
// across a user's COMPLETED orders only — same "only COMPLETED counts as
// real spend" rule stats.service.ts already applies to every sale/profit
// aggregate; a PENDING/FAILED order was never actually paid out. 1 taka
// spent = 1 spendPoint (fixed ratio, matches the frontend type's comment).
export async function getTopSpenders(limit = 10) {
    const grouped = await prisma.order.groupBy({
        by: ["userId"],
        where: { status: "COMPLETED" },
        _sum: { charge: true },
        orderBy: { _sum: { charge: "desc" } },
        take: limit,
    });
    if (grouped.length === 0)
        return [];
    const users = await prisma.user.findMany({
        where: { id: { in: grouped.map((g) => g.userId) } },
        select: { id: true, username: true, avatarUrl: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));
    return grouped.map((g, i) => {
        const user = userById.get(g.userId);
        return {
            rank: i + 1,
            userId: g.userId,
            displayName: user?.username ?? "Unknown",
            avatarUrl: user?.avatarUrl ?? null,
            spendPoints: Number(g._sum.charge ?? 0),
        };
    });
}
