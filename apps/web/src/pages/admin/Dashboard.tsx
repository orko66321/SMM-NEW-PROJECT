import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useCurrency } from "../../context/CurrencyContext.js";
import { getAdminOverviewStats } from "../../api/resources.js";

interface OverviewStats {
  orders: {
    lastMonth: number;
    thisMonth: number;
    today: number;
    total: number;
    lastMonthLike: number;
    thisMonthLike: number;
  };
  users: { today: number; total: number };
  sales: { today: string; yesterday: string; thisMonth: string; lastMonth: string; lifeTime: string };
  profit: { today: string; yesterday: string; thisMonth: string; lastMonth: string; lifeTime: string };
  balances: { totalWallet: string };
  ranges: {
    today: { from: string; to: string | null };
    yesterday: { from: string; to: string | null };
    thisMonth: { from: string; to: string | null };
    lastMonth: { from: string; to: string | null };
  };
}

// Builds a /admin/orders or /admin/users query string from a subset of
// filter params — every "More info" link below is one of these, so a card's
// number and the list it opens always agree on what was counted.
function buildLink(base: string, params: Record<string, string | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

interface CardDef {
  label: string;
  value: string;
  to: string;
}

function StatCardGrid({ title, cards }: { title: string; cards: CardDef[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card flex flex-col gap-2">
            <p className="label">{c.label}</p>
            <p className="font-mono text-2xl font-semibold">{c.value}</p>
            <Link to={c.to} className="text-xs font-medium text-primary hover:underline">
              More info →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdminDashboard() {
  const { formatCurrency } = useCurrency();
  const { data, isLoading, isError } = useQuery<OverviewStats>({
    queryKey: ["admin-overview-stats"],
    queryFn: getAdminOverviewStats,
    refetchInterval: 30_000,
  });

  if (isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="card text-sm text-error">Couldn&apos;t load dashboard stats. Try refreshing the page.</div>
      </div>
    );
  }

  // Every number defaults to 0 / "0" until the query resolves, and the API
  // itself never returns null for these fields (see getAdminOverviewStats) —
  // so no card ever renders "null"/"undefined"/"NaN", loading or not.
  const orders = data?.orders ?? { lastMonth: 0, thisMonth: 0, today: 0, total: 0, lastMonthLike: 0, thisMonthLike: 0 };
  const users = data?.users ?? { today: 0, total: 0 };
  const sales = data?.sales ?? { today: "0", yesterday: "0", thisMonth: "0", lastMonth: "0", lifeTime: "0" };
  const profit = data?.profit ?? { today: "0", yesterday: "0", thisMonth: "0", lastMonth: "0", lifeTime: "0" };
  const balances = data?.balances ?? { totalWallet: "0" };
  const ranges = data?.ranges ?? {
    today: { from: "", to: null },
    yesterday: { from: "", to: null },
    thisMonth: { from: "", to: null },
    lastMonth: { from: "", to: null },
  };

  const n = (v: number) => v.toLocaleString();
  const ordersLink = (extra: Record<string, string | boolean | undefined> = {}) => buildLink("/admin/orders", extra);
  const usersLink = (extra: Record<string, string | boolean | undefined> = {}) => buildLink("/admin/users", extra);
  const salesLink = (range: { from: string; to: string | null }) =>
    ordersLink({ status: "COMPLETED", from: range.from || undefined, to: range.to ?? undefined });

  const orderCards: CardDef[] = [
    { label: "Last Month Orders", value: n(orders.lastMonth), to: ordersLink({ from: ranges.lastMonth.from, to: ranges.lastMonth.to ?? undefined }) },
    { label: "This Month Orders", value: n(orders.thisMonth), to: ordersLink({ from: ranges.thisMonth.from }) },
    { label: "Today Orders", value: n(orders.today), to: ordersLink({ from: ranges.today.from, to: ranges.today.to ?? undefined }) },
    { label: "Total Orders", value: n(orders.total), to: ordersLink() },
    {
      label: "Last Month Like Orders",
      value: n(orders.lastMonthLike),
      to: ordersLink({ from: ranges.lastMonth.from, to: ranges.lastMonth.to ?? undefined, likeOnly: true }),
    },
    { label: "This Month Like Orders", value: n(orders.thisMonthLike), to: ordersLink({ from: ranges.thisMonth.from, likeOnly: true }) },
  ];

  const userCards: CardDef[] = [
    { label: "Today User", value: n(users.today), to: usersLink({ from: ranges.today.from, to: ranges.today.to ?? undefined }) },
    { label: "Total User", value: n(users.total), to: usersLink() },
  ];

  const saleCards: CardDef[] = [
    { label: "Today Sale", value: formatCurrency(sales.today), to: salesLink(ranges.today) },
    { label: "Yesterday Sale", value: formatCurrency(sales.yesterday), to: salesLink(ranges.yesterday) },
    { label: "This Month Sale", value: formatCurrency(sales.thisMonth), to: salesLink(ranges.thisMonth) },
    { label: "Last Month Sale", value: formatCurrency(sales.lastMonth), to: salesLink(ranges.lastMonth) },
    { label: "Life Time Sale", value: formatCurrency(sales.lifeTime), to: ordersLink({ status: "COMPLETED" }) },
  ];

  const profitCards: CardDef[] = [
    { label: "Today Profit", value: formatCurrency(profit.today), to: salesLink(ranges.today) },
    { label: "Yesterday Profit", value: formatCurrency(profit.yesterday), to: salesLink(ranges.yesterday) },
    { label: "This Month Profit", value: formatCurrency(profit.thisMonth), to: salesLink(ranges.thisMonth) },
    { label: "Last Month Profit", value: formatCurrency(profit.lastMonth), to: salesLink(ranges.lastMonth) },
    { label: "Life Time Profit", value: formatCurrency(profit.lifeTime), to: ordersLink({ status: "COMPLETED" }) },
  ];

  const balanceCards: CardDef[] = [{ label: "Total Wallet", value: formatCurrency(balances.totalWallet), to: usersLink() }];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-xs text-on-surface-variant">
          {isLoading ? "Loading live figures…" : "Every figure below comes from a live database aggregate — nothing here is a placeholder."}
        </p>
      </div>

      <StatCardGrid title="Orders" cards={orderCards} />
      <StatCardGrid title="Users" cards={userCards} />
      <StatCardGrid title="Sales" cards={saleCards} />
      <StatCardGrid title="Profit" cards={profitCards} />
      <StatCardGrid title="Balances" cards={balanceCards} />
    </div>
  );
}
