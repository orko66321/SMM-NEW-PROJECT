import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OrderStatusValues } from "@smm/shared";
import { getAdminOrders, updateAdminOrderStatus } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

export default function AdminOrders() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", status, search, page],
    queryFn: () => getAdminOrders({ page, pageSize: 20, status: status || undefined, search: search || undefined }),
  });

  async function onStatusChange(id: string, newStatus: string) {
    try {
      await updateAdminOrderStatus(id, { status: newStatus as never });
      toast.push("Order status updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to update order"), "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Orders</h1>
        <div className="flex gap-2">
          <input className="input-field" placeholder="Search ID / link / username" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className="input-field" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {OrderStatusValues.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Charge</th>
              <th className="px-4 py-3">Profit</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading && <tr><td colSpan={8} className="px-4 py-6 text-center text-on-surface-variant">Loading…</td></tr>}
            {data?.items.map((o: { id: string; user: { username: string }; service: { name: string }; charge: string; providerCost: string; quantity: number; status: string }) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{o.id.slice(0, 8)}</td>
                <td className="px-4 py-3">{o.user.username}</td>
                <td className="px-4 py-3">{o.service.name}</td>
                <td className="px-4 py-3 font-mono text-success">${o.charge}</td>
                <td className="px-4 py-3 font-mono text-info">${(Number(o.charge) - Number(o.providerCost)).toFixed(4)}</td>
                <td className="px-4 py-3 font-mono">{o.quantity}</td>
                <td className="px-4 py-3"><span className="badge bg-primary/15 text-primary">{o.status}</span></td>
                <td className="px-4 py-3">
                  <select className="input-field !py-1.5 text-xs" value={o.status} onChange={(e) => onStatusChange(o.id, e.target.value)}>
                    {OrderStatusValues.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex justify-center gap-2">
          <button className="btn-ghost !px-3 !py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span className="self-center text-xs text-on-surface-variant">Page {page}</span>
          <button className="btn-ghost !px-3 !py-1.5 text-xs" disabled={page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
