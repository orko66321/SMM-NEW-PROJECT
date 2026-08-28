import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminPackage,
  deleteAdminPackage,
  getAdminPackages,
  getAdminProducts,
  getAdminStockPools,
  updateAdminPackage,
} from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

interface PackageRow {
  id: string;
  productId: string;
  name: string;
  amount: number;
  salePrice: string;
  buyPrice: string;
  commonPriceUsd: string;
  extraFee: string;
  level: number;
  isAuto: boolean;
  isManual: boolean;
  server: string | null;
  stockPoolLinks: { pool: { id: string; name: string } }[];
}

const emptyForm = {
  productId: "",
  name: "",
  amount: "1",
  salePrice: "",
  buyPrice: "0",
  commonPriceUsd: "",
  extraFee: "0",
  level: "0",
  isAuto: false,
  isManual: false,
  server: "",
  stockPoolIds: [] as string[],
};

export default function AdminPackages() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const productFilter = searchParams.get("productId") ?? "";

  const { data: products } = useQuery({ queryKey: ["admin-products-all"], queryFn: () => getAdminProducts({ page: 1, pageSize: 200 }) });
  const { data: stockPools } = useQuery({ queryKey: ["admin-stock-pools-all"], queryFn: () => getAdminStockPools({ page: 1, pageSize: 200 }) });

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data } = useQuery({
    queryKey: ["admin-packages", productFilter, page],
    queryFn: () => getAdminPackages({ page, pageSize, productId: productFilter || undefined }),
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
  }

  function openAddNew() {
    setEditingId(null);
    setForm({ ...emptyForm, productId: productFilter || "" });
    setFormOpen(true);
  }

  function openEdit(p: PackageRow) {
    setEditingId(p.id);
    setForm({
      productId: p.productId,
      name: p.name,
      amount: String(p.amount),
      salePrice: String(p.salePrice),
      buyPrice: String(p.buyPrice),
      commonPriceUsd: String(p.commonPriceUsd),
      extraFee: String(p.extraFee),
      level: String(p.level),
      isAuto: p.isAuto,
      isManual: p.isManual,
      server: p.server ?? "",
      stockPoolIds: p.stockPoolLinks.map((l) => l.pool.id),
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function toggleStockPool(id: string) {
    setForm((f) => ({
      ...f,
      stockPoolIds: f.stockPoolIds.includes(id) ? f.stockPoolIds.filter((x) => x !== id) : [...f.stockPoolIds, id],
    }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const input = {
        productId: form.productId,
        name: form.name.trim(),
        amount: Number(form.amount) || 1,
        salePrice: Number(form.salePrice) || 0,
        buyPrice: Number(form.buyPrice) || 0,
        commonPriceUsd: Number(form.commonPriceUsd) || 0,
        extraFee: Number(form.extraFee) || 0,
        level: Number(form.level) || 0,
        isAuto: form.isAuto,
        isManual: form.isManual,
        server: form.server.trim() || null,
        stockPoolIds: form.stockPoolIds,
      };
      if (editingId) {
        await updateAdminPackage(editingId, input);
        toast.push("Package updated.", "success");
      } else {
        await createAdminPackage(input);
        toast.push("Package created.", "success");
      }
      closeForm();
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to save package"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(p: PackageRow) {
    if (!window.confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    try {
      await deleteAdminPackage(p.id);
      toast.push("Package deleted.", "success");
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to delete package"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Store — Packages</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Belongs to a Product. Auto-fulfills via the Product's linked Service, or claims a code from linked Stock Pools.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input-field"
            value={productFilter}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value) next.set("productId", e.target.value); else next.delete("productId");
              setSearchParams(next);
              setPage(1);
            }}
          >
            <option value="">All products</option>
            {products?.items.map((p: { id: string; name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {!formOpen && <button type="button" className="btn-primary shrink-0" onClick={openAddNew}>+ Add New</button>}
        </div>
      </div>

      {formOpen && (
        <form onSubmit={onSubmit} className="card space-y-4">
          <h2 className="text-sm font-semibold">{editingId ? "Edit package" : "New package"}</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pk-name">Name</label>
              <input id="pk-name" className="input-field" placeholder="e.g. 25 Diamond" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label" htmlFor="pk-product">Product</label>
              <select id="pk-product" className="input-field" value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))} required>
                <option value="">Select a product…</option>
                {products?.items.map((p: { id: string; name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="pk-amount">amount</label>
              <input id="pk-amount" type="number" className="input-field" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="label" htmlFor="pk-sale">Sale Price</label>
              <input id="pk-sale" type="number" step="0.0001" className="input-field" value={form.salePrice} onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))} required />
            </div>
            <div>
              <label className="label" htmlFor="pk-buy">Buy price</label>
              <input id="pk-buy" type="number" step="0.0001" className="input-field" value={form.buyPrice} onChange={(e) => setForm((f) => ({ ...f, buyPrice: e.target.value }))} />
            </div>
            <div>
              <label className="label" htmlFor="pk-common">Common Price (USD)</label>
              <input id="pk-common" type="number" step="0.0001" className="input-field" value={form.commonPriceUsd} onChange={(e) => setForm((f) => ({ ...f, commonPriceUsd: e.target.value }))} required />
            </div>
          </div>
          <p className="-mt-2 text-xs text-on-surface-variant">Sale Price is what's actually charged to the wallet (USD, this app's canonical currency) — Common Price (USD) is kept as an import-fidelity reference alongside it, matching the source panel's convention.</p>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="pk-fee">extra_fee</label>
              <input id="pk-fee" type="number" step="0.0001" className="input-field" value={form.extraFee} onChange={(e) => setForm((f) => ({ ...f, extraFee: e.target.value }))} />
            </div>
            <div>
              <label className="label" htmlFor="pk-level">Level</label>
              <input id="pk-level" type="number" className="input-field" value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} />
            </div>
            <div>
              <label className="label" htmlFor="pk-server">Server</label>
              <input id="pk-server" className="input-field" placeholder="Optional — e.g. BD / Global" value={form.server} onChange={(e) => setForm((f) => ({ ...f, server: e.target.value }))} />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isAuto} onChange={(e) => setForm((f) => ({ ...f, isAuto: e.target.checked, isManual: e.target.checked ? false : f.isManual }))} /> IS AUTO
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isManual} onChange={(e) => setForm((f) => ({ ...f, isManual: e.target.checked, isAuto: e.target.checked ? false : f.isAuto }))} /> Is Manual
            </label>
          </div>
          {form.isAuto && (
            <p className="text-xs text-warning">
              IS AUTO only works when the Package's Product is Product Type "SMM" and has a Service linked — otherwise fulfillment will reject the order at purchase time.
            </p>
          )}

          <div>
            <p className="label">Selected relative ids (Click to add item)</p>
            <p className="mb-2 text-xs text-on-surface-variant">Stock Pools this package claims a code from when not auto-fulfilled. Manage pools and their codes on the Stock Pools page.</p>
            <div className="flex flex-wrap gap-2">
              {stockPools?.items.map((pool: { id: string; name: string; available: number }) => {
                const selected = form.stockPoolIds.includes(pool.id);
                return (
                  <button
                    type="button"
                    key={pool.id}
                    onClick={() => toggleStockPool(pool.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      selected ? "border-primary bg-primary/15 text-primary" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {pool.name} ({pool.available} available)
                  </button>
                );
              })}
              {stockPools?.items.length === 0 && <p className="text-xs text-on-surface-variant">No stock pools yet — create one on the Stock Pools page.</p>}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save changes" : "Create package"}</button>
            <button type="button" className="btn-ghost" onClick={closeForm}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Sale Price</th>
              <th className="px-4 py-3">Extra fee</th>
              <th className="px-4 py-3">Buy Price</th>
              <th className="px-4 py-3">Actual Sale Price</th>
              <th className="px-4 py-3">Common Price (USD)</th>
              <th className="px-4 py-3">IS AUTO</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Is Manual</th>
              <th className="px-4 py-3">Server</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {data?.items.map((p: PackageRow) => (
              <tr key={p.id}>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3 font-mono">${p.salePrice}</td>
                <td className="px-4 py-3 font-mono">${p.extraFee}</td>
                <td className="px-4 py-3 font-mono">${p.buyPrice}</td>
                <td className="px-4 py-3 font-mono">${(Number(p.salePrice) + Number(p.extraFee)).toFixed(4)}</td>
                <td className="px-4 py-3 font-mono">${p.commonPriceUsd}</td>
                <td className="px-4 py-3">{p.isAuto ? 1 : 0}</td>
                <td className="px-4 py-3 font-mono">{p.level}</td>
                <td className="px-4 py-3">{p.isManual ? 1 : 0}</td>
                <td className="px-4 py-3">{p.server ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => openEdit(p)}>Edit</button>
                    <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs text-error" onClick={() => onDelete(p)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-on-surface-variant">No packages yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button className="btn-ghost !px-3 !py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="text-on-surface-variant">Page {page} / {totalPages}</span>
          <button className="btn-ghost !px-3 !py-1.5 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
