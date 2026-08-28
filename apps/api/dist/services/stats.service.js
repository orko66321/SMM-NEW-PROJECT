import { Prisma } from "#prisma/client";
import { prisma } from "../lib/prisma.js";
// Every number here comes from a real aggregate query — no fabricated or
// hardcoded metrics, per the project's explicit "never fake trust/stat
// numbers" requirement.
export async function getAdminStats() {
    const [totalUsers, totalOrders, failedOrders, revenueAgg, profitAgg, pendingDeposits, openTickets] = await Promise.all([
        prisma.user.count(),
        prisma.order.count(),
        prisma.order.count({ where: { status: "FAILED" } }),
        prisma.order.aggregate({ _sum: { charge: true } }),
        prisma.order.aggregate({ _sum: { charge: true, providerCost: true } }),
        prisma.deposit.count({ where: { status: "PENDING" } }),
        prisma.ticket.count({ where: { status: { in: ["OPEN", "PENDING_ADMIN"] } } }),
    ]);
    const totalRevenue = revenueAgg._sum.charge ?? new Prisma.Decimal(0);
    const totalCost = profitAgg._sum.providerCost ?? new Prisma.Decimal(0);
    return {
        totalUsers,
        totalOrders,
        failedOrders,
        pendingDeposits,
        openTickets,
        totalRevenue: totalRevenue.toString(),
        totalProfit: totalRevenue.minus(totalCost).toString(),
    };
}
// Real, public-safe aggregates for the landing page's stats counter — no
// revenue/profit here (that stays admin-only), same "never fabricate trust
// numbers" rule as getAdminStats above.
export async function getPublicStats() {
    const [totalUsers, totalOrdersCompleted, totalServices] = await Promise.all([
        prisma.user.count(),
        prisma.order.count({ where: { status: "COMPLETED" } }),
        prisma.service.count({ where: { status: "ACTIVE" } }),
    ]);
    return { totalUsers, totalOrdersCompleted, totalServices };
}
function decimalToString(value) {
    return (value ?? new Prisma.Decimal(0)).toString();
}
function profitString(charge, cost) {
    return (charge ?? new Prisma.Decimal(0)).minus(cost ?? new Prisma.Decimal(0)).toString();
}
// Orders whose service sits under a category name containing "Like" (e.g.
// the seeded "Instagram Likes" / "Facebook Page Likes") — the schema has no
// dedicated order-type flag, so this is the closest real signal for the
// admin dashboard's "Like Orders" cards. Shared with the /admin/orders
// ?likeOnly=true filter behind the cards' "More info" links so the count
// shown here always matches what that link lands on.
const LIKE_ORDER_FILTER = {
    service: { category: { name: { contains: "Like", mode: "insensitive" } } },
};
// Powers the admin dashboard's stat-card overview. Every figure is a single
// real aggregate/count query, all run in parallel — no looping in
// application code, no fabricated numbers. Every date boundary is computed
// once from the server's local clock/timezone and reused for both the
// aggregate `where` clauses below AND the `ranges` returned to the client,
// so the "More info" deep links (built from those same ISO strings) always
// land on exactly the rows counted here — no client/server drift.
export async function getAdminOverviewStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const [lastMonthOrders, thisMonthOrders, todayOrders, totalOrders, lastMonthLikeOrders, thisMonthLikeOrders, todayUsers, totalUsers, todaySaleAgg, yesterdaySaleAgg, thisMonthSaleAgg, lastMonthSaleAgg, lifeTimeSaleAgg, walletAgg,] = await Promise.all([
        prisma.order.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
        prisma.order.count({ where: { createdAt: { gte: startOfThisMonth } } }),
        prisma.order.count({ where: { createdAt: { gte: startOfToday, lt: startOfTomorrow } } }),
        prisma.order.count(),
        prisma.order.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfThisMonth }, ...LIKE_ORDER_FILTER } }),
        prisma.order.count({ where: { createdAt: { gte: startOfThisMonth }, ...LIKE_ORDER_FILTER } }),
        prisma.user.count({ where: { createdAt: { gte: startOfToday, lt: startOfTomorrow } } }),
        prisma.user.count(),
        prisma.order.aggregate({
            _sum: { charge: true, providerCost: true },
            where: { status: "COMPLETED", createdAt: { gte: startOfToday, lt: startOfTomorrow } },
        }),
        prisma.order.aggregate({
            _sum: { charge: true, providerCost: true },
            where: { status: "COMPLETED", createdAt: { gte: startOfYesterday, lt: startOfToday } },
        }),
        prisma.order.aggregate({
            _sum: { charge: true, providerCost: true },
            where: { status: "COMPLETED", createdAt: { gte: startOfThisMonth } },
        }),
        prisma.order.aggregate({
            _sum: { charge: true, providerCost: true },
            where: { status: "COMPLETED", createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
        }),
        prisma.order.aggregate({ _sum: { charge: true, providerCost: true }, where: { status: "COMPLETED" } }),
        prisma.wallet.aggregate({ _sum: { balance: true } }),
    ]);
    return {
        orders: {
            lastMonth: lastMonthOrders,
            thisMonth: thisMonthOrders,
            today: todayOrders,
            total: totalOrders,
            lastMonthLike: lastMonthLikeOrders,
            thisMonthLike: thisMonthLikeOrders,
        },
        users: {
            today: todayUsers,
            total: totalUsers,
        },
        sales: {
            today: decimalToString(todaySaleAgg._sum.charge),
            yesterday: decimalToString(yesterdaySaleAgg._sum.charge),
            thisMonth: decimalToString(thisMonthSaleAgg._sum.charge),
            lastMonth: decimalToString(lastMonthSaleAgg._sum.charge),
            lifeTime: decimalToString(lifeTimeSaleAgg._sum.charge),
        },
        profit: {
            today: profitString(todaySaleAgg._sum.charge, todaySaleAgg._sum.providerCost),
            yesterday: profitString(yesterdaySaleAgg._sum.charge, yesterdaySaleAgg._sum.providerCost),
            thisMonth: profitString(thisMonthSaleAgg._sum.charge, thisMonthSaleAgg._sum.providerCost),
            lastMonth: profitString(lastMonthSaleAgg._sum.charge, lastMonthSaleAgg._sum.providerCost),
            lifeTime: profitString(lifeTimeSaleAgg._sum.charge, lifeTimeSaleAgg._sum.providerCost),
        },
        balances: {
            totalWallet: decimalToString(walletAgg._sum.balance),
        },
        // ISO boundaries the queries above actually used — the dashboard's
        // "More info" links are built from these, not recomputed client-side,
        // so a link always lands on exactly the rows its card counted.
        ranges: {
            today: { from: startOfToday.toISOString(), to: startOfTomorrow.toISOString() },
            yesterday: { from: startOfYesterday.toISOString(), to: startOfToday.toISOString() },
            thisMonth: { from: startOfThisMonth.toISOString(), to: null },
            lastMonth: { from: startOfLastMonth.toISOString(), to: startOfThisMonth.toISOString() },
        },
    };
}
// Raw SQL for the date_trunc grouping Prisma's query builder can't express —
// same "$queryRaw inside otherwise-typed services" precedent as
// deposit.service.ts's lockDeposit. Feeds the admin dashboard's Recharts
// daily sales/profit/order-volume charts.
export async function getDailySalesStats(days) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await prisma.$queryRaw `
    SELECT date_trunc('day', "createdAt") AS date,
           COALESCE(SUM("charge"), 0) AS revenue,
           COALESCE(SUM("providerCost"), 0) AS cost,
           COUNT(*) AS "orderCount"
    FROM "Order"
    WHERE "createdAt" >= ${since}
    GROUP BY date
    ORDER BY date ASC
  `;
    return rows.map((r) => {
        const revenue = new Prisma.Decimal(r.revenue);
        const cost = new Prisma.Decimal(r.cost);
        return {
            date: r.date.toISOString().slice(0, 10),
            revenue: revenue.toString(),
            profit: revenue.minus(cost).toString(),
            orderCount: Number(r.orderCount),
        };
    });
}
