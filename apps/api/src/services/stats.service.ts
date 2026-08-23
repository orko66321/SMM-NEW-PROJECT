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
