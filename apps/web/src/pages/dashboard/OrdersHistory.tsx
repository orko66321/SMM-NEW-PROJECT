import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OrderStatusValues } from "@smm/shared";
import { getMyOrders } from "../../api/resources.js";

const statusTabs = ["ALL", ...OrderStatusValues] as const;

export default function OrdersHistory() {
  const [status, setStatus] = useState<(typeof statusTabs)[number]>("ALL");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["orders", status, page],
    queryFn: () => getMyOrders({ page, pageSize: 20, status: status === "ALL" ? undefined : status }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Orders History</h1>

      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatus(tab);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              status === tab ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Link</th>
              <th className="px-4 py-3">Charge</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Remains</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-on-surface-variant">Loading…</td></tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-on-surface-variant">No orders found.</td></tr>
            )}
            {data?.items.map((o: { id: string; createdAt: string; service: { name: string }; link: string; charge: string; quantity: number; remains: number | null; status: string }) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{o.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">{o.service.name}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-xs text-on-surface-variant">{o.link}</td>
                <td className="px-4 py-3 font-mono">${o.charge}</td>
                <td className="px-4 py-3 font-mono">{o.quantity}</td>
                <td className="px-4 py-3 font-mono">{o.remains ?? "—"}</td>
                <td className="px-4 py-3"><span className="badge bg-primary/15 text-primary">{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex justify-center gap-2">
          <button className="btn-ghost !px-3 !py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span className="self-center text-xs text-on-surface-variant">Page {page}</span>
          <button
            className="btn-ghost !px-3 !py-1.5 text-xs"
            disabled={page * data.pageSize >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
