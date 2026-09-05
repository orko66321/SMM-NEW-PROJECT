import { useQuery } from "@tanstack/react-query";
import { getAdminReferralAnalytics } from "../../api/resources.js";
import { useCurrency } from "../../context/CurrencyContext.js";
import { Breadcrumbs, StatCard } from "../../components/ds/index.js";

export default function AdminReferrals() {
  const { formatCurrency } = useCurrency();
  const { data, isLoading } = useQuery({ queryKey: ["admin-referral-analytics"], queryFn: getAdminReferralAnalytics });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Referrals" }]} />
      <h1 className="text-xl font-bold">Referral Analytics</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Completed referrals" value={String(data?.totalReferrals ?? 0)} />
        <StatCard label="Referrer payouts" value={formatCurrency(data?.totalReferrerPayouts ?? 0)} />
        <StatCard label="Referee bonuses" value={formatCurrency(data?.totalRefereeBonuses ?? 0)} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Top referrers</h2>
        <div className="overflow-x-auto rounded-lg border border-outline-variant">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-surface-container-high text-left text-xs uppercase text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Referrals</th>
                <th className="px-4 py-3">Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {isLoading && <tr><td colSpan={3} className="px-4 py-6 text-center text-on-surface-variant">Loading…</td></tr>}
              {!isLoading && (data?.topReferrers.length ?? 0) === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-on-surface-variant">No referral payouts yet.</td></tr>
              )}
              {data?.topReferrers.map((r) => (
                <tr key={r.username}>
                  <td className="px-4 py-3">{r.username}</td>
                  <td className="px-4 py-3 font-mono">{r.referrals}</td>
                  <td className="px-4 py-3 font-mono text-success">{formatCurrency(r.earnings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
