import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OrderStatusValues } from "@smm/shared";
import { getAdminOrders, getAdminRefills, resolveAdminRefill, updateAdminOrderStatus } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

type RefillRow = {
  id: string;
  status: string;
  providerRefillId: string | null;
  note: string | null;
  createdAt: string;
  order: { id: string; service: { name: string }; user: { username: string } };
};

const REFILL_STATUS_STYLES: Record<string, string> = {
  REQUESTED: "bg-warning/15 text-warning",
  IN_PROGRESS: "bg-info/15 text-info",
  COMPLETED: "bg-success/15 text-success",
  REJECTED: "bg-error/15 text-error",
};

function RefillRequestsPanel() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("REQUESTED");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-refills", status],
    queryFn: () => getAdminRefills({ page: 1, pageSize: 50, status: status || undefined }),
  });

  async function onResolve(id: string, next: "COMPLETED" | "REJECTED") {
    try {
      await resolveAdminRefill(id, { status: next });
      toast.push(`Refill marked ${next.toLowerCase()}.`, "success");
      queryClient.invalidateQueries({ queryKey: ["admin-refills"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to resolve refill"), "error");
    }
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold">Refill requests</h2>
        <select className="input-field w-full sm:w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="REQUESTED">Requested (needs action)</option>
          <option value="IN_PROGRESS">In progress (auto)</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Requested</th>
              <th className="px-3 py-2">Resolve</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading && <tr><td colSpan={6} className="px-3 py-4 text-center text-on-surface-variant">Loading…</td></tr>}
            {!isLoading && data?.items.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-on-surface-variant">No refill requests.</td></tr>
            )}
            {data?.items.map((r: RefillRow) => (
              <tr key={r.id}>
                <td className="px-3 py-2">{r.order.user.username}</td>
                <td className="px-3 py-2">{r.order.service.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-on-surface-variant">{r.order.id.slice(0, 8)}</td>
                <td className="px-3 py-2"><span className={`badge ${REFILL_STATUS_STYLES[r.status] ?? ""}`}>{r.status}</span></td>
                <td className="px-3 py-2 text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  {r.status === "REQUESTED" ? (
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-ghost !min-h-[36px] !px-3 !py-1.5 text-xs" onClick={() => onResolve(r.id, "COMPLETED")}>Mark done</button>
                      <button className="btn-ghost !min-h-[36px] !px-3 !py-1.5 text-xs text-error" onClick={() => onResolve(r.id, "REJECTED")}>Reject</button>
                    </div>
                  ) : (
                    <span className="text-xs text-on-surface-variant">
                      {r.status === "IN_PROGRESS" ? "Awaiting provider" : "Resolved"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", status, search, page],
    queryFn: () => getAdminOrders({ page, pageSize: 20, status: status || undefined, search: search || undefined }),
  });

  async function onCopyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      // clipboard unavailable — no-op
    }
  }

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Orders</h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="input-field w-full sm:w-auto" placeholder="Search ID / link / username" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className="input-field w-full sm:w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
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
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center gap-1 sm:min-h-0"
                    onClick={() => onCopyId(o.id)}
                    aria-label="Copy full order ID"
                    title={o.id}
                  >
                    {o.id.slice(0, 8)}
                    <span className="text-[10px] text-primary">{copiedId === o.id ? "Copied" : "Copy"}</span>
                  </button>
                </td>
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

      <RefillRequestsPanel />
    </div>
  );
}
