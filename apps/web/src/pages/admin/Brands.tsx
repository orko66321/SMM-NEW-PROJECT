import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductDesignTemplateValues, type ProductDesignTemplate } from "@smm/shared";
import { createAdminBrand, deleteAdminBrand, getAdminBrands, updateAdminBrand } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

interface BrandRow {
  id: string;
  name: string;
  level: number;
  productDesign: ProductDesignTemplate;
  logo: string | null;
  isActive: boolean;
  _count?: { products: number };
}

// Matches bannerInputSchema's cap (packages/shared) — same convention as AdminBanner.
const MAX_IMAGE_CHARS = 3_000_000;

const DESIGN_LABELS: Record<ProductDesignTemplate, string> = {
  SMALL_STRIP: "Design No-1 (Small strip)",
  STANDARD_GRID: "Design No-2 (Standard grid)",
  FEATURED_LARGE: "Design No-3 (Featured / large)",
};

const emptyForm = { name: "", level: "0", productDesign: "STANDARD_GRID" as ProductDesignTemplate, logo: "", isActive: true };

export default function AdminBrands() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data } = useQuery({ queryKey: ["admin-brands", page], queryFn: () => getAdminBrands({ page, pageSize }) });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    queryClient.invalidateQueries({ queryKey: ["store-brands"] });
  }

  function openAddNew() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(b: BrandRow) {
    setEditingId(b.id);
    setForm({ name: b.name, level: String(b.level), productDesign: b.productDesign, logo: b.logo ?? "", isActive: b.isActive });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      if (dataUrl.length > MAX_IMAGE_CHARS) {
        toast.push("Logo is too large — please use a smaller file (roughly under 2MB).", "error");
        e.target.value = "";
        return;
      }
      setForm((f) => ({ ...f, logo: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const input = {
        name: form.name.trim(),
        level: Number(form.level) || 0,
        productDesign: form.productDesign,
        logo: form.logo || null,
        isActive: form.isActive,
      };
      if (editingId) {
        await updateAdminBrand(editingId, input);
        toast.push("Brand updated.", "success");
      } else {
        await createAdminBrand(input);
        toast.push("Brand created.", "success");
      }
      closeForm();
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to save brand"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(b: BrandRow) {
    if (!window.confirm(`Delete "${b.name}"? Brands with products are disabled instead of deleted.`)) return;
    try {
      await deleteAdminBrand(b.id);
      toast.push("Brand removed.", "success");
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to delete brand"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Store — Brands</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Top-level Store sections — a real platform ("YouTube Service") or a promo grouping ("SPECIAL OFFER"). Lower Level sorts first;
            negative values pin a section ahead of everything else.
          </p>
        </div>
        {!formOpen && (
          <button type="button" className="btn-primary shrink-0" onClick={openAddNew}>
            + Add New
          </button>
        )}
      </div>

      {formOpen && (
        <form onSubmit={onSubmit} className="card space-y-4">
          <h2 className="text-sm font-semibold">{editingId ? "Edit brand" : "New brand"}</h2>

          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" className="input-field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="level">Level</label>
              <input
                id="level"
                type="number"
                className="input-field"
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                required
              />
              <p className="mt-1 text-xs text-on-surface-variant">Global homepage sort order — negative pins it first.</p>
            </div>
            <div>
              <label className="label" htmlFor="productDesign">Choose Product Design (Optional)</label>
              <select
                id="productDesign"
                className="input-field"
                value={form.productDesign}
                onChange={(e) => setForm((f) => ({ ...f, productDesign: e.target.value as ProductDesignTemplate }))}
              >
                {ProductDesignTemplateValues.map((d) => (
                  <option key={d} value={d}>{DESIGN_LABELS[d]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="logo">Logo</label>
            <input
              id="logo"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="input-field file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-on-primary"
              onChange={onLogoChange}
            />
            {form.logo && <img src={form.logo} alt="Preview" className="mt-3 h-16 w-16 rounded-lg border border-outline-variant object-cover" />}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            Active (unchecked = Inactive, hidden from the Store)
          </label>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : editingId ? "Save changes" : "Create brand"}
            </button>
            <button type="button" className="btn-ghost" onClick={closeForm}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Logo</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {data?.items.map((b: BrandRow, i: number) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-4 py-3">{b.name}</td>
                <td className="px-4 py-3">
                  {b.logo ? <img src={b.logo} alt="" className="h-9 w-9 rounded object-cover" /> : <span className="text-on-surface-variant">—</span>}
                </td>
                <td className="px-4 py-3 font-mono">{b.level}</td>
                <td className="px-4 py-3">
                  <Link to={`/admin/products?brandId=${b.id}`} className="text-primary hover:underline">
                    {b._count?.products ?? 0}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${b.isActive ? "bg-success/15 text-success" : "bg-error/15 text-error"}`}>{b.isActive ? "on" : "off"}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => openEdit(b)}>Edit</button>
                    <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs text-error" onClick={() => onDelete(b)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">No brands yet.</td></tr>
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
