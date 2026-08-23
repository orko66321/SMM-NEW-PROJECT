import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminDeposits, reviewAdminDeposit } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

export default function AdminDeposits() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("PENDING");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-deposits", status],
    queryFn: () => getAdminDeposits({ page: 1, pageSize: 50, status: status || undefined }),
  });

  async function onReview(id: string, action: "APPROVE" | "REJECT") {
    try {
      await reviewAdminDeposit(id, action);
      toast.push(`Deposit ${action.toLowerCase()}d.`, "success");
      queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to review deposit"), "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Payment Notifications</h1>
        <select className="input-field max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-on-surface-variant">Loading…</td></tr>}
            {data?.items.map((d: { id: string; user: { username: string }; method: string; amount: string; reference: string | null; status: string }) => (
              <tr key={d.id}>
                <td className="px-4 py-3">{d.user.username}</td>
                <td className="px-4 py-3">{d.method}</td>
                <td className="px-4 py-3 font-mono text-success">${d.amount}</td>
                <td className="px-4 py-3 text-xs text-on-surface-variant">{d.reference ?? "—"}</td>
                <td className="px-4 py-3"><span className="badge bg-warning/15 text-warning">{d.status}</span></td>
                <td className="px-4 py-3 text-right">
                  {d.status === "PENDING" && (
                    <div className="flex justify-end gap-2">
                      <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => onReview(d.id, "APPROVE")}>Approve</button>
                      <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => onReview(d.id, "REJECT")}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-on-surface-variant">No deposits found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
