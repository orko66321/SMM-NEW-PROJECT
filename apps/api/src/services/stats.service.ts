import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

// Every number here comes from a real aggregate query — no fabricated or
// hardcoded metrics, per the project's explicit "never fake trust/stat
// numbers" requirement.
export async function getAdminStats() {
  const [totalUsers, totalOrders, failedOrders, revenueAgg, profitAgg, pendingDeposits, openTickets] =
    await Promise.all([
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

interface DailyStatsRow {
  date: Date;
  revenue: Prisma.Decimal;
  cost: Prisma.Decimal;
  orderCount: bigint;
}

// Raw SQL for the date_trunc grouping Prisma's query builder can't express —
// same "$queryRaw inside otherwise-typed services" precedent as
// deposit.service.ts's lockDeposit. Feeds the admin dashboard's Recharts
// daily sales/profit/order-volume charts.
export async function getDailySalesStats(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<DailyStatsRow[]>`
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
