import { Fragment, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkAddAdminStockCodes,
  createAdminStockPool,
  deleteAdminStockPool,
  getAdminStockCodes,
  getAdminStockPools,
  revokeAdminStockCode,
} from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

interface PoolRow {
  id: string;
  name: string;
  available: number;
  consumed: number;
  revoked: number;
}

function CodesPanel({ poolId }: { poolId: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [bulkText, setBulkText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { data } = useQuery({ queryKey: ["admin-stock-codes", poolId, page], queryFn: () => getAdminStockCodes(poolId, { page, pageSize }) });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-stock-codes", poolId] });
    queryClient.invalidateQueries({ queryKey: ["admin-stock-pools"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stock-pools-all"] });
  }

  async function onBulkAdd(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await bulkAddAdminStockCodes(poolId, bulkText);
      toast.push(`Added ${result.added} code(s).`, "success");
      setBulkText("");
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to add codes"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onRevoke(codeId: string) {
    if (!window.confirm("Revoke this code? It will no longer be claimable.")) return;
    try {
      await revokeAdminStockCode(codeId);
      toast.push("Code revoked.", "success");
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to revoke code"), "error");
    }
  }

  return (
    <div className="space-y-3 border-t border-outline-variant bg-surface-container/60 p-4">
      <form onSubmit={onBulkAdd} className="space-y-2">
        <label className="label" htmlFor={`bulk-${poolId}`}>Bulk-add codes (one per line)</label>
        <textarea
          id={`bulk-${poolId}`}
          rows={4}
          className="input-field font-mono text-xs"
          placeholder={"CODE-ABC-123\nCODE-DEF-456"}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
        />
        <button type="submit" className="btn-primary !px-3 !py-1.5 text-xs" disabled={submitting || !bulkText.trim()}>
          {submitting ? "Adding…" : "Add codes"}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs">
          <thead className="border-b border-outline-variant text-left uppercase text-on-surface-variant">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Added</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {data?.items.map((c: { id: string; status: string; code: string | null; orderId: string | null; createdAt: string }) => (
              <tr key={c.id}>
                <td className="px-3 py-2 font-mono">{c.code ?? "••••••••"}</td>
                <td className="px-3 py-2">
                  <span className={`badge ${c.status === "AVAILABLE" ? "bg-success/15 text-success" : c.status === "CONSUMED" ? "bg-info/15 text-info" : "bg-error/15 text-error"}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-on-surface-variant">{c.orderId ? c.orderId.slice(0, 8) : "—"}</td>
                <td className="px-3 py-2">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-right">
                  {c.status === "AVAILABLE" && (
                    <button type="button" className="text-error hover:underline" onClick={() => onRevoke(c.id)}>Revoke</button>
                  )}
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-on-surface-variant">No codes yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {data && data.total > pageSize && (
        <div className="flex items-center justify-center gap-3 text-xs">
          <button className="btn-ghost !px-2 !py-1 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="text-on-surface-variant">Page {page}</span>
          <button className="btn-ghost !px-2 !py-1 text-xs" disabled={page * pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

export default function AdminStockPools() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data } = useQuery({ queryKey: ["admin-stock-pools", page], queryFn: () => getAdminStockPools({ page, pageSize }) });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-stock-pools"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stock-pools-all"] });
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      await createAdminStockPool({ name: newName.trim() });
      toast.push("Stock pool created.", "success");
      setNewName("");
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to create stock pool"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(pool: PoolRow) {
    if (!window.confirm(`Delete pool "${pool.name}"? Only possible while it isn't linked to any package.`)) return;
    try {
      await deleteAdminStockPool(pool.id);
      toast.push("Stock pool deleted.", "success");
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to delete stock pool"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Store — Stock Pools</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Named, reusable pools of redeemable codes/credentials — link one or more to a Package's "Selected relative ids" to power manual fulfillment. Codes are encrypted at rest.
        </p>
      </div>

      <form onSubmit={onCreate} className="card flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <label className="label" htmlFor="new-pool-name">New pool name</label>
          <input id="new-pool-name" className="input-field" placeholder="e.g. Monthly Code" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary" disabled={submitting || !newName.trim()}>{submitting ? "Creating…" : "Create pool"}</button>
      </form>

      <div className="card overflow-hidden p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Sold</th>
              <th className="px-4 py-3">Revoked</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {data?.items.map((pool: PoolRow) => (
              <Fragment key={pool.id}>
                <tr>
                  <td className="px-4 py-3 font-medium">{pool.name}</td>
                  <td className="px-4 py-3 font-mono text-success">{pool.available}</td>
                  <td className="px-4 py-3 font-mono text-info">{pool.consumed}</td>
                  <td className="px-4 py-3 font-mono text-error">{pool.revoked}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setExpanded(expanded === pool.id ? null : pool.id)}>
                        {expanded === pool.id ? "Hide codes" : "Manage codes"}
                      </button>
                      <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs text-error" onClick={() => onDelete(pool)}>Del</button>
                    </div>
                  </td>
                </tr>
                {expanded === pool.id && (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <CodesPanel poolId={pool.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {data?.items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">No stock pools yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > pageSize && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button className="btn-ghost !px-3 !py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="text-on-surface-variant">Page {page}</span>
          <button className="btn-ghost !px-3 !py-1.5 text-xs" disabled={page * pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
