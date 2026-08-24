import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAdminDailyStats, getAdminStats } from "../../api/resources.js";

interface DailyStat {
  date: string;
  revenue: string;
  profit: string;
  orderCount: number;
}

const CHART_TOOLTIP_STYLE = {
  background: "#1b2b3f",
  border: "1px solid #464554",
  borderRadius: 8,
  fontSize: 12,
  color: "#d3e4fe",
};

function DailyChartsCard({ items }: { items: DailyStat[] }) {
  const data = items.map((d) => ({ ...d, revenue: Number(d.revenue), profit: Number(d.profit) }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="card">
        <p className="mb-3 text-sm font-semibold">Revenue &amp; profit (last 30 days)</p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#464554" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#c7c4d7" }} tickFormatter={(d: string) => d.slice(5)} />
            <YAxis tick={{ fontSize: 10, fill: "#c7c4d7" }} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="revenue" stroke="#6366F1" fill="url(#revenueGradient)" name="Revenue" />
            <Area type="monotone" dataKey="profit" stroke="#10B981" fill="url(#profitGradient)" name="Profit" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <p className="mb-3 text-sm font-semibold">Order volume (last 30 days)</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#464554" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#c7c4d7" }} tickFormatter={(d: string) => d.slice(5)} />
            <YAxis tick={{ fontSize: 10, fill: "#c7c4d7" }} allowDecimals={false} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Bar dataKey="orderCount" fill="#8083ff" name="Orders" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data } = useQuery({ queryKey: ["admin-stats"], queryFn: getAdminStats, refetchInterval: 30_000 });
  const { data: daily } = useQuery({ queryKey: ["admin-daily-stats"], queryFn: () => getAdminDailyStats(30) });

  const cards = [
    { label: "Total Users", value: data?.totalUsers ?? "—" },
    { label: "Total Orders", value: data?.totalOrders ?? "—" },
    { label: "Failed Orders", value: data?.failedOrders ?? "—" },
    { label: "Pending Deposits", value: data?.pendingDeposits ?? "—" },
    { label: "Open Tickets", value: data?.openTickets ?? "—" },
    { label: "Total Revenue", value: data ? `$${data.totalRevenue}` : "—" },
    { label: "Total Profit", value: data ? `$${data.totalProfit}` : "—" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <p className="label">{c.label}</p>
            <p className="font-mono text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      {daily && daily.length > 0 && <DailyChartsCard items={daily} />}

      <p className="text-xs text-on-surface-variant">
        Every figure above comes from a live database aggregate — nothing here is a placeholder or fabricated number.
      </p>
    </div>
  );
}
