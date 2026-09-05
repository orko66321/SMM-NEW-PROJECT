import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
/** The Refer & Earn page: the user's own code + stats + reward history. */
export async function getMyReferralSummary(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { referralCode: true, totalReferralEarnings: true },
    });
    if (!user)
        throw AppError.notFound("User not found");
    const [invitedCount, logs] = await Promise.all([
        prisma.user.count({ where: { referredById: userId } }),
        prisma.referralLog.findMany({
            where: { referrerId: userId },
            orderBy: { createdAt: "desc" },
            take: 100,
            include: { referee: { select: { username: true, createdAt: true } } },
        }),
    ]);
    return {
        referralCode: user.referralCode,
        invitedCount,
        totalEarnings: user.totalReferralEarnings.toString(),
        history: logs.map((l) => ({
            refereeUsername: l.referee.username,
            registeredAt: l.referee.createdAt.toISOString(),
            rewardedAt: l.createdAt.toISOString(),
            rewardAmount: l.rewardAmount.toString(),
            refereeDepositAmount: l.refereeDepositAmount.toString(),
            status: l.status,
        })),
    };
}
/** Admin referral analytics — total payouts, count, and the leaderboard. */
export async function getReferralAnalyticsForAdmin() {
    const [agg, totalReferrals, grouped] = await Promise.all([
        prisma.referralLog.aggregate({ _sum: { rewardAmount: true, refereeBonusAmount: true } }),
        prisma.referralLog.count(),
        prisma.referralLog.groupBy({
            by: ["referrerId"],
            _sum: { rewardAmount: true },
            _count: { _all: true },
            orderBy: { _sum: { rewardAmount: "desc" } },
            take: 20,
        }),
    ]);
    const referrers = grouped.length
        ? await prisma.user.findMany({
            where: { id: { in: grouped.map((g) => g.referrerId) } },
            select: { id: true, username: true },
        })
        : [];
    const nameById = new Map(referrers.map((r) => [r.id, r.username]));
    return {
        totalReferrerPayouts: agg._sum.rewardAmount?.toString() ?? "0",
        totalRefereeBonuses: agg._sum.refereeBonusAmount?.toString() ?? "0",
        totalReferrals,
        topReferrers: grouped.map((g) => ({
            username: nameById.get(g.referrerId) ?? "—",
            referrals: g._count._all,
            earnings: g._sum.rewardAmount?.toString() ?? "0",
        })),
    };
}
