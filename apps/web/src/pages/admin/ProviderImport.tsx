import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkImportAdminProviderServices,
  getAdminProviderImportPreview,
  getAdminProviders,
} from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { Breadcrumbs } from "../../components/ds/index.js";

interface PreviewRow {
  providerServiceId: string;
  name: string;
  description: string | null;
  category: string;
  platform: string;
  providerCostPer1000: string;
  minQuantity: number;
  maxQuantity: number;
  refillEnabled: boolean;
  cancelEnabled: boolean;
  alreadyImported: boolean;
  invalidReason: string | null;
}

interface ProviderItem {
  id: string;
  name: string;
}

export default function AdminProviderImport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: providers } = useQuery({ queryKey: ["admin-providers"], queryFn: getAdminProviders });
  const provider = (providers ?? []).find((p: ProviderItem) => p.id === id);

  const {
    data: preview,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-provider-import-preview", id],
    queryFn: () => getAdminProviderImportPreview(id!),
    enabled: !!id,
    retry: false,
  });

  const [search, setSearch] = useState("");
  const [markupPercent, setMarkupPercent] = useState(20);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  // Default selection: everything importable (new + valid) pre-checked, so
  // a single click on "Import Selected" really does import the whole new
  // catalog in one go — the admin only needs to deselect rows they don't
  // want, not hunt through thousands of rows to select them all by hand.
  useEffect(() => {
    if (!preview) return;
    const importable = preview.items.filter((i: PreviewRow) => !i.alreadyImported && !i.invalidReason);
    setSelected(new Set(importable.map((i: PreviewRow) => i.providerServiceId)));
  }, [preview]);

  const filteredItems: PreviewRow[] = useMemo(() => {
    const items: PreviewRow[] = preview?.items ?? [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }, [preview, search]);

  function toggle(providerServiceId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(providerServiceId)) next.delete(providerServiceId);
      else next.add(providerServiceId);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of filteredItems) {
        if (!item.alreadyImported && !item.invalidReason) next.add(item.providerServiceId);
      }
      return next;
    });
  }

  function deselectAll() {
    setSelected(new Set());
  }

  async function onImport() {
    if (selected.size === 0 || !id) return;
    setImporting(true);
    try {
      const result = await bulkImportAdminProviderServices(id, {
        providerServiceIds: Array.from(selected),
        markupPercent,
        autoSubmit,
      });
      toast.push(
        `${result.imported} সার্ভিস ইম্পোর্ট হয়েছে` +
          (result.alreadySkipped > 0 ? ` (${result.alreadySkipped} আগে থেকেই ছিল)` : "") +
          (result.invalidSkipped.length > 0 ? ` — ${result.invalidSkipped.length} টি বাদ পড়েছে (ভুল ডেটা)` : ""),
        "success",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      await refetch();
    } catch (err) {
      toast.push(apiErrorMessage(err, "ইম্পোর্ট ব্যর্থ হয়েছে"), "error");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Providers", to: "/admin/providers" }, { label: "Bulk Import" }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Bulk Import Services {provider ? `— ${provider.name}` : ""}</h1>
          <p className="text-sm text-on-surface-variant">
            প্রোভাইডারের সম্পূর্ণ ক্যাটালগ থেকে সরাসরি Service (ও প্রয়োজনে ক্যাটাগরি) তৈরি করে — একই সার্ভিস দুইবার ইম্পোর্ট হবে না।
          </p>
        </div>
        <button type="button" className="btn-ghost w-full sm:w-auto" onClick={() => refetch()} disabled={isLoading}>
          {isLoading ? "লোড হচ্ছে…" : "রিফ্রেশ"}
        </button>
      </div>

      {isLoading && (
        <div className="card text-center text-sm text-on-surface-variant">
          প্রোভাইডারের সম্পূর্ণ ক্যাটালগ আনা হচ্ছে — কয়েক হাজার সার্ভিস থাকলে কিছুটা সময় লাগতে পারে…
        </div>
      )}

      {isError && (
        <div className="card border border-error/40 bg-error/10 text-sm text-error">
          {apiErrorMessage(error, "প্রোভাইডার থেকে ক্যাটালগ আনতে ব্যর্থ — API URL/Key ঠিক আছে কিনা যাচাই করুন।")}
        </div>
      )}

      {preview && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card text-center">
              <p className="label">মোট সার্ভিস</p>
              <p className="font-mono text-xl font-semibold">{preview.total}</p>
            </div>
            <div className="card text-center">
              <p className="label">নতুন (ইম্পোর্টযোগ্য)</p>
              <p className="font-mono text-xl font-semibold text-success">{preview.importable}</p>
            </div>
            <div className="card text-center">
              <p className="label">আগে থেকেই আছে</p>
              <p className="font-mono text-xl font-semibold text-on-surface-variant">{preview.alreadyImported}</p>
            </div>
            <div className="card text-center">
              <p className="label">ত্রুটিপূর্ণ (বাদ)</p>
              <p className="font-mono text-xl font-semibold text-warning">{preview.invalid}</p>
            </div>
          </div>

          <div className="card flex flex-wrap items-end gap-4">
            <div>
              <label className="label" htmlFor="markup">মার্কআপ % (বিক্রয়মূল্য = cost × (1 + %))</label>
              <input
                id="markup"
                type="number"
                min={0}
                step="0.5"
                className="input-field w-32"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(Number(e.target.value))}
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" checked={autoSubmit} onChange={(e) => setAutoSubmit(e.target.checked)} />
              Auto-fulfill চালু করুন (ডিফল্ট বন্ধ থাকা নিরাপদ — ভেরিফাই না করে বাল্ক-ইম্পোর্ট করা সার্ভিসে অর্ডার অটো-সাবমিট না করাই ভালো)
            </label>
            <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <input
                className="input-field w-full sm:w-56"
                placeholder="নাম বা ক্যাটাগরি দিয়ে খুঁজুন…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex gap-2">
                <button type="button" className="btn-ghost flex-1 !px-3 !py-1.5 text-xs sm:flex-none" onClick={selectAllVisible}>সব সিলেক্ট</button>
                <button type="button" className="btn-ghost flex-1 !px-3 !py-1.5 text-xs sm:flex-none" onClick={deselectAll}>সব বাতিল</button>
              </div>
            </div>
          </div>

          <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-md border border-primary/40 bg-surface-container p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <span className="font-mono font-semibold text-primary">{selected.size}</span> টি সার্ভিস সিলেক্ট করা হয়েছে
            </p>
            <button type="button" className="btn-primary w-full sm:w-auto" onClick={onImport} disabled={selected.size === 0 || importing}>
              {importing ? "ইম্পোর্ট হচ্ছে…" : `ইম্পোর্ট করুন (${selected.size})`}
            </button>
          </div>

          <div className="card max-h-[600px] overflow-auto p-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 bg-surface-container-high text-left text-xs uppercase text-on-surface-variant">
                <tr>
                  <th className="px-3 py-3" />
                  <th className="px-3 py-3">Service</th>
                  <th className="px-3 py-3">Category / Platform</th>
                  <th className="px-3 py-3">Cost / 1K</th>
                  <th className="px-3 py-3">বিক্রয়মূল্য / 1K</th>
                  <th className="px-3 py-3">Min–Max</th>
                  <th className="px-3 py-3">Badges</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredItems.map((item) => {
                  const disabled = item.alreadyImported || !!item.invalidReason;
                  const sellPrice = Math.round(Number(item.providerCostPer1000) * (1 + markupPercent / 100) * 10_000) / 10_000;
                  return (
                    <tr key={item.providerServiceId} className={disabled ? "opacity-50" : "hover:bg-surface-container/40"}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={selected.has(item.providerServiceId)}
                          onChange={() => toggle(item.providerServiceId)}
                        />
                      </td>
                      <td className="max-w-[260px] px-3 py-2">
                        <p className="truncate">{item.name}</p>
                        {item.description && (
                          <p className="truncate text-xs text-on-surface-variant" title={item.description}>{item.description}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-on-surface-variant">
                        {item.category}
                        <br />
                        <span className="badge bg-surface-container-high text-on-surface-variant">{item.platform}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">${item.providerCostPer1000}</td>
                      <td className="px-3 py-2 font-mono text-xs text-primary">${sellPrice.toFixed(4)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-on-surface-variant">{item.minQuantity}–{item.maxQuantity}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {item.refillEnabled && <span className="badge bg-info/15 text-info">Refill</span>}
                          {item.cancelEnabled && <span className="badge bg-warning/15 text-warning">Cancel</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {item.alreadyImported && <span className="badge bg-outline-variant/40 text-on-surface-variant">Imported</span>}
                        {item.invalidReason && <span className="badge bg-error/15 text-error" title={item.invalidReason}>Invalid</span>}
                        {!item.alreadyImported && !item.invalidReason && <span className="badge bg-success/15 text-success">New</span>}
                      </td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-on-surface-variant">কোনো সার্ভিস পাওয়া যায়নি।</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <button type="button" className="text-xs text-on-surface-variant hover:underline" onClick={() => navigate("/admin/providers")}>
        Providers পেজে ফিরে যান
      </button>
    </div>
  );
}
