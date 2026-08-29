import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminProvider,
  deleteAdminProvider,
  getAdminProviderLogs,
  getAdminProviders,
  syncAdminProvider,
  updateAdminProvider,
} from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { Breadcrumbs } from "../../components/ds/index.js";
import { useToast } from "../../components/ui/Toast.js";

interface ProviderItem {
  id: string;
  name: string;
  apiUrl: string;
  balance: string;
  status: string;
  lastSyncAt: string | null;
}

export default function AdminProviders() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: providers } = useQuery({ queryKey: ["admin-providers"], queryFn: getAdminProviders });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: logs } = useQuery({
    queryKey: ["admin-provider-logs", selectedId],
    queryFn: () => getAdminProviderLogs(selectedId!),
    enabled: !!selectedId,
  });

  const [form, setForm] = useState({ name: "", apiUrl: "", apiKey: "" });
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAdminProvider(form);
      toast.push("Provider added.", "success");
      setForm({ name: "", apiUrl: "", apiKey: "" });
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to add provider"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onToggleStatus(p: ProviderItem) {
    try {
      await updateAdminProvider(p.id, { status: p.status === "ACTIVE" ? "DISABLED" : "ACTIVE" });
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to update provider"), "error");
    }
  }

  async function onSync(id: string) {
    try {
      const result = await syncAdminProvider(id);
      toast.push(`Synced: ${result.updatedCount}/${result.remoteCount} services updated.`, "success");
      queryClient.invalidateQueries({ queryKey: ["admin-provider-logs", id] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Sync failed"), "error");
    }
  }

  async function onDelete(p: ProviderItem) {
    if (!window.confirm(`"${p.name}" প্রোভাইডারটি স্থায়ীভাবে মুছে ফেলবেন?`)) return;
    try {
      await deleteAdminProvider(p.id);
      toast.push("Provider deleted.", "success");
      if (selectedId === p.id) setSelectedId(null);
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to delete provider — it may still have services mapped to it"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Providers" }]} />
      <h1 className="text-xl font-bold">Providers</h1>
      <p className="text-sm text-on-surface-variant">
        Upstream SMM reseller accounts (JAP-standard API). Services opt into auto-fulfillment individually
        from the Services page — adding a provider here does not change any existing order behavior.
      </p>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">API URL</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Sync</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {providers?.map((p: ProviderItem) => (
              <tr key={p.id} className="cursor-pointer hover:bg-surface-container-high" onClick={() => setSelectedId(p.id)}>
                <td className="px-4 py-3">{p.name}</td>
                <td className="max-w-[240px] truncate px-4 py-3 text-xs text-on-surface-variant">{p.apiUrl}</td>
                <td className="px-4 py-3 font-mono">${p.balance}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${p.status === "ACTIVE" ? "bg-success/15 text-success" : "bg-outline-variant/40 text-on-surface-variant"}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-xs">{p.lastSyncAt ? new Date(p.lastSyncAt).toLocaleString() : "Never"}</td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    <Link to={`/admin/providers/${p.id}/import`} className="btn-primary !px-3 !py-1.5 text-xs">
                      Import Services
                    </Link>
                    <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => onSync(p.id)}>Sync now</button>
                    <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => onToggleStatus(p)}>
                      {p.status === "ACTIVE" ? "Disable" : "Enable"}
                    </button>
                    <button className="btn-ghost !px-3 !py-1.5 text-xs text-error" onClick={() => onDelete(p)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {providers?.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-on-surface-variant">No providers yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {selectedId && (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold">Sync logs</h2>
          <ul className="divide-y divide-outline-variant text-sm">
            {logs?.map((l: { id: string; action: string; status: string; message: string | null; createdAt: string }) => (
              <li key={l.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <span className="font-mono text-xs">{l.action}</span>
                <span className="text-xs text-on-surface-variant sm:max-w-[40%] sm:truncate">{l.message ?? "—"}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-on-surface-variant">{new Date(l.createdAt).toLocaleString()}</span>
                  <span className={`badge ${l.status === "SUCCESS" ? "bg-success/15 text-success" : "bg-error/15 text-error"}`}>{l.status}</span>
                </span>
              </li>
            ))}
            {logs?.length === 0 && <p className="py-3 text-on-surface-variant">No sync activity yet.</p>}
          </ul>
        </div>
      )}

      <form onSubmit={onCreate} className="card max-w-md space-y-3">
        <h2 className="text-sm font-semibold">Add provider</h2>
        <input className="input-field" placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <input className="input-field" placeholder="API URL (e.g. https://provider.com/api/v2)" value={form.apiUrl} onChange={(e) => setForm((f) => ({ ...f, apiUrl: e.target.value }))} required />
        <input className="input-field" placeholder="API key" type="password" value={form.apiKey} onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))} required />
        <p className="text-xs text-on-surface-variant">The key is encrypted at rest and never shown again after saving.</p>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>{submitting ? "Adding…" : "Add provider"}</button>
      </form>
    </div>
  );
}
