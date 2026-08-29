import { useState, type ChangeEvent, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AccessTypeValues,
  PackageDesignTemplateValues,
  ProductTypeValues,
  type AccessType,
  type PackageDesignTemplate,
  type ProductType,
} from "@smm/shared";
import {
  createAdminProduct,
  deleteAdminProduct,
  getAdminBrands,
  getAdminProducts,
  getAdminServices,
  updateAdminProduct,
} from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { Breadcrumbs } from "../../components/ds/index.js";

const MAX_IMAGE_CHARS = 3_000_000;

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  salePrice: string;
  buyPrice: string;
  productType: ProductType;
  accessType: AccessType;
  isActive: boolean;
  isAuto: boolean;
  brandId: string;
  brand?: { name: string };
  _count?: { packages: number };
  // The admin API returns the full Product row (every field in
  // productObjectSchema) — only the columns this table renders are declared
  // above; openEdit reads the rest through this index signature.
  [key: string]: unknown;
}

const emptyForm = {
  brandId: "",
  name: "",
  slug: "",
  userInputFieldName: "Link",
  orderInstructionsLink: "",
  salePrice: "",
  buyPrice: "0",
  quantity: "1",
  productType: "TOPUP" as ProductType,
  accessType: "ALL" as AccessType,
  logo: "",
  secondaryType: "",
  level: "0",
  isAuto: false,
  isActive: true,
  productNote: "",
  gameCheaterType: "",
  hasOrderTimeLimit: false,
  maxOrdersPerWindow: "",
  orderWindowHours: "",
  checkUniquePlayerId: false,
  isQuantityMinusOnOrder: false,
  isQuantityShowUser: false,
  isPremiumProduct: false,
  minAmountForPremium: "",
  removeCharacters: "",
  redeemLink: "",
  isResellerProduct: false,
  isMysteryBox: false,
  description: "",
  packageDesign: "RADIO_LIST" as PackageDesignTemplate,
  serviceId: "",
};

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminProducts() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const brandFilter = searchParams.get("brandId") ?? "";

  const { data: brands } = useQuery({ queryKey: ["admin-brands-all"], queryFn: () => getAdminBrands({ page: 1, pageSize: 100 }) });
  const { data: services } = useQuery({ queryKey: ["admin-services-all"], queryFn: () => getAdminServices({ page: 1, pageSize: 200 }) });

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data } = useQuery({
    queryKey: ["admin-products", brandFilter, page],
    queryFn: () => getAdminProducts({ page, pageSize, brandId: brandFilter || undefined }),
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  }

  function openAddNew() {
    setEditingId(null);
    setForm({ ...emptyForm, brandId: brandFilter || "" });
    setSlugTouched(false);
    setFormOpen(true);
  }

  function openEdit(p: ProductRow) {
    setEditingId(p.id);
    setForm({
      brandId: p.brandId,
      name: p.name,
      slug: p.slug,
      userInputFieldName: String(p.userInputFieldName ?? "Link"),
      orderInstructionsLink: String(p.orderInstructionsLink ?? ""),
      salePrice: String(p.salePrice),
      buyPrice: String(p.buyPrice),
      quantity: String(p.quantity ?? 1),
      productType: p.productType,
      accessType: p.accessType,
      logo: String(p.logo ?? ""),
      secondaryType: String(p.secondaryType ?? ""),
      level: String(p.level ?? 0),
      isAuto: !!p.isAuto,
      isActive: p.isActive,
      productNote: String(p.productNote ?? ""),
      gameCheaterType: String(p.gameCheaterType ?? ""),
      hasOrderTimeLimit: !!p.hasOrderTimeLimit,
      maxOrdersPerWindow: p.maxOrdersPerWindow != null ? String(p.maxOrdersPerWindow) : "",
      orderWindowHours: p.orderWindowHours != null ? String(p.orderWindowHours) : "",
      checkUniquePlayerId: !!p.checkUniquePlayerId,
      isQuantityMinusOnOrder: !!p.isQuantityMinusOnOrder,
      isQuantityShowUser: !!p.isQuantityShowUser,
      isPremiumProduct: !!p.isPremiumProduct,
      minAmountForPremium: p.minAmountForPremium != null ? String(p.minAmountForPremium) : "",
      removeCharacters: String(p.removeCharacters ?? ""),
      redeemLink: String(p.redeemLink ?? ""),
      isResellerProduct: !!p.isResellerProduct,
      isMysteryBox: !!p.isMysteryBox,
      description: String(p.description ?? ""),
      packageDesign: p.packageDesign as PackageDesignTemplate,
      serviceId: String(p.serviceId ?? ""),
    });
    setSlugTouched(true);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
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
        brandId: form.brandId,
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        userInputFieldName: form.userInputFieldName.trim() || "Link",
        orderInstructionsLink: form.orderInstructionsLink.trim() || null,
        salePrice: Number(form.salePrice) || 0,
        buyPrice: Number(form.buyPrice) || 0,
        quantity: Number(form.quantity) || 1,
        productType: form.productType,
        accessType: form.accessType,
        logo: form.logo || null,
        secondaryType: form.secondaryType.trim() || null,
        level: Number(form.level) || 0,
        isAuto: form.isAuto,
        isActive: form.isActive,
        productNote: form.productNote.trim() || null,
        gameCheaterType: form.gameCheaterType.trim() || null,
        hasOrderTimeLimit: form.hasOrderTimeLimit,
        maxOrdersPerWindow: form.hasOrderTimeLimit ? Number(form.maxOrdersPerWindow) || null : null,
        orderWindowHours: form.hasOrderTimeLimit ? Number(form.orderWindowHours) || null : null,
        checkUniquePlayerId: form.checkUniquePlayerId,
        isQuantityMinusOnOrder: form.isQuantityMinusOnOrder,
        isQuantityShowUser: form.isQuantityShowUser,
        isPremiumProduct: form.isPremiumProduct,
        minAmountForPremium: form.isPremiumProduct ? Number(form.minAmountForPremium) || 0 : null,
        removeCharacters: form.removeCharacters || null,
        redeemLink: form.redeemLink.trim() || null,
        isResellerProduct: form.isResellerProduct,
        isMysteryBox: form.isMysteryBox,
        description: form.description.trim() || null,
        packageDesign: form.packageDesign,
        serviceId: form.productType === "SMM" ? form.serviceId || null : null,
      };
      if (editingId) {
        await updateAdminProduct(editingId, input);
        toast.push("Product updated.", "success");
      } else {
        await createAdminProduct(input);
        toast.push("Product created.", "success");
      }
      closeForm();
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to save product"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(p: ProductRow) {
    if (!window.confirm(`Disable "${p.name}"?`)) return;
    try {
      await deleteAdminProduct(p.id);
      toast.push("Product disabled.", "success");
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to disable product"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Store" }, { label: "Products" }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Store — Products</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Belongs to a Brand. Either links an existing Service (SMM, auto-fulfilled) or is manually managed.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input-field"
            value={brandFilter}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value) next.set("brandId", e.target.value); else next.delete("brandId");
              setSearchParams(next);
              setPage(1);
            }}
          >
            <option value="">All brands</option>
            {brands?.items.map((b: { id: string; name: string }) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {!formOpen && <button type="button" className="btn-primary shrink-0" onClick={openAddNew}>+ Add New</button>}
        </div>
      </div>

      {formOpen && (
        <form onSubmit={onSubmit} className="card space-y-5">
          <h2 className="text-sm font-semibold">{editingId ? "Edit product" : "New product"}</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="p-name">Name</label>
              <input
                id="p-name"
                className="input-field"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
                }}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="p-brand">Brand</label>
              <select id="p-brand" className="input-field" value={form.brandId} onChange={(e) => setForm((f) => ({ ...f, brandId: e.target.value }))} required>
                <option value="">Select a brand…</option>
                {brands?.items.map((b: { id: string; name: string }) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="p-slug">Slug</label>
              <input
                id="p-slug"
                className="input-field"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, slug: e.target.value }));
                }}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="p-type">Product Type</label>
              <select id="p-type" className="input-field" value={form.productType} onChange={(e) => setForm((f) => ({ ...f, productType: e.target.value as ProductType }))}>
                {ProductTypeValues.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="p-access">Access Type</label>
              <select id="p-access" className="input-field" value={form.accessType} onChange={(e) => setForm((f) => ({ ...f, accessType: e.target.value as AccessType }))}>
                {AccessTypeValues.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {form.productType === "SMM" && (
            <div>
              <label className="label" htmlFor="p-service">Linked Service (required for SMM)</label>
              <select id="p-service" className="input-field" value={form.serviceId} onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))} required>
                <option value="">Select the provider service this product sells…</option>
                {services?.items.map((s: { id: string; name: string }) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <p className="mt-1 text-xs text-on-surface-variant">Packages under this product may flag "IS AUTO" to fulfill automatically through this Service's existing provider pipeline.</p>
            </div>
          )}

          <div>
            <label className="label" htmlFor="p-inputLabel">User input field name</label>
            <input id="p-inputLabel" className="input-field" placeholder="Link / Player ID / Username / Email" value={form.userInputFieldName} onChange={(e) => setForm((f) => ({ ...f, userInputFieldName: e.target.value }))} required />
            <p className="mt-1 text-xs text-on-surface-variant">Label shown to the buyer at checkout for whatever they need to type in.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="p-sale">Sale Price</label>
              <input id="p-sale" type="number" step="0.0001" className="input-field" value={form.salePrice} onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))} required />
            </div>
            <div>
              <label className="label" htmlFor="p-buy">Buy Price</label>
              <input id="p-buy" type="number" step="0.0001" className="input-field" value={form.buyPrice} onChange={(e) => setForm((f) => ({ ...f, buyPrice: e.target.value }))} />
            </div>
            <div>
              <label className="label" htmlFor="p-qty">Quantity (default)</label>
              <input id="p-qty" type="number" className="input-field" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="p-level">Level</label>
              <input id="p-level" type="number" className="input-field" value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} />
            </div>
            <div>
              <label className="label" htmlFor="p-pkgDesign">Choose Package Design (Optional)</label>
              <select id="p-pkgDesign" className="input-field" value={form.packageDesign} onChange={(e) => setForm((f) => ({ ...f, packageDesign: e.target.value as PackageDesignTemplate }))}>
                {PackageDesignTemplateValues.map((d) => <option key={d} value={d}>{d === "RADIO_LIST" ? "Radio-card list" : "Boxed grid"}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="p-logo">Logo</label>
              <input id="p-logo" type="file" accept="image/*" className="input-field file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-on-primary" onChange={onLogoChange} />
            </div>
          </div>
          {form.logo && <img src={form.logo} alt="Preview" className="h-16 w-16 rounded-lg border border-outline-variant object-cover" />}

          <div>
            <label className="label" htmlFor="p-instructions">কিভাবে অর্ডার করবেন? (Link)</label>
            <input id="p-instructions" className="input-field" placeholder="https://…" value={form.orderInstructionsLink} onChange={(e) => setForm((f) => ({ ...f, orderInstructionsLink: e.target.value }))} />
          </div>

          <div>
            <label className="label" htmlFor="p-desc">Description</label>
            <textarea id="p-desc" rows={4} className="input-field" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>

          <div>
            <label className="label" htmlFor="p-note">Product Note</label>
            <input id="p-note" className="input-field" placeholder="e.g. Game / Top up (internal admin note)" value={form.productNote} onChange={(e) => setForm((f) => ({ ...f, productNote: e.target.value }))} />
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isAuto} onChange={(e) => setForm((f) => ({ ...f, isAuto: e.target.checked }))} /> Is Auto</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} /> Is Active</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isResellerProduct} onChange={(e) => setForm((f) => ({ ...f, isResellerProduct: e.target.checked }))} /> Is Reseller Product</label>
          </div>

          <details className="rounded-lg border border-outline-variant p-3">
            <summary className="cursor-pointer text-sm font-semibold text-on-surface-variant">Advanced (anti-abuse / gaming — Phase 2)</summary>
            <div className="mt-4 space-y-4">
              <div>
                <label className="label" htmlFor="p-secondaryType">Type (secondary classifier)</label>
                <input id="p-secondaryType" className="input-field" value={form.secondaryType} onChange={(e) => setForm((f) => ({ ...f, secondaryType: e.target.value }))} />
              </div>
              <div>
                <label className="label" htmlFor="p-gct">Game Cheater Type</label>
                <input id="p-gct" className="input-field" placeholder="Optional — gaming top-ups only" value={form.gameCheaterType} onChange={(e) => setForm((f) => ({ ...f, gameCheaterType: e.target.value }))} />
              </div>

              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.hasOrderTimeLimit} onChange={(e) => setForm((f) => ({ ...f, hasOrderTimeLimit: e.target.checked }))} /> Have Order Time Limit</label>
              {form.hasOrderTimeLimit && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="p-maxOrders">Limited Maximum number of order</label>
                    <input id="p-maxOrders" type="number" className="input-field" value={form.maxOrdersPerWindow} onChange={(e) => setForm((f) => ({ ...f, maxOrdersPerWindow: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label" htmlFor="p-windowHours">Limited time duration (Hour)</label>
                    <input id="p-windowHours" type="number" className="input-field" value={form.orderWindowHours} onChange={(e) => setForm((f) => ({ ...f, orderWindowHours: e.target.value }))} />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.checkUniquePlayerId} onChange={(e) => setForm((f) => ({ ...f, checkUniquePlayerId: e.target.checked }))} /> Check Unique Player ID (manual-review flag only — no live lookup API yet)</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isQuantityMinusOnOrder} onChange={(e) => setForm((f) => ({ ...f, isQuantityMinusOnOrder: e.target.checked }))} /> Is Quantity minus order time</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isQuantityShowUser} onChange={(e) => setForm((f) => ({ ...f, isQuantityShowUser: e.target.checked }))} /> Is Quantity show user</label>

              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPremiumProduct} onChange={(e) => setForm((f) => ({ ...f, isPremiumProduct: e.target.checked }))} /> Is Premium Product</label>
              {form.isPremiumProduct && (
                <div>
                  <label className="label" htmlFor="p-minPremium">Min Amount to Start Premium</label>
                  <input id="p-minPremium" type="number" step="0.01" className="input-field max-w-xs" value={form.minAmountForPremium} onChange={(e) => setForm((f) => ({ ...f, minAmountForPremium: e.target.value }))} />
                </div>
              )}

              <div>
                <label className="label" htmlFor="p-removeChars">Is remove Characters</label>
                <input id="p-removeChars" className="input-field" placeholder="e.g. characters to strip from the input, such as - or space" value={form.removeCharacters} onChange={(e) => setForm((f) => ({ ...f, removeCharacters: e.target.value }))} />
              </div>

              <div>
                <label className="label" htmlFor="p-redeem">Redeem Link</label>
                <input id="p-redeem" className="input-field" placeholder="https://…" value={form.redeemLink} onChange={(e) => setForm((f) => ({ ...f, redeemLink: e.target.value }))} />
              </div>

              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isMysteryBox} onChange={(e) => setForm((f) => ({ ...f, isMysteryBox: e.target.checked }))} /> Is Mystery Box (stored only — not yet fulfilled differently)</label>
            </div>
          </details>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save changes" : "Create product"}</button>
            <button type="button" className="btn-ghost" onClick={closeForm}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">SN</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Buy Price</th>
              <th className="px-4 py-3">Sale Price</th>
              <th className="px-4 py-3">Product Type</th>
              <th className="px-4 py-3">Access Type</th>
              <th className="px-4 py-3">Packages</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {data?.items.map((p: ProductRow, i: number) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-4 py-3">
                  {p.name}
                  <div className="text-xs text-on-surface-variant">{p.brand?.name}</div>
                </td>
                <td className="px-4 py-3 font-mono">${p.buyPrice}</td>
                <td className="px-4 py-3 font-mono">${p.salePrice}</td>
                <td className="px-4 py-3"><span className="badge bg-info/15 text-info">{p.productType}</span></td>
                <td className="px-4 py-3"><span className="badge bg-primary/15 text-primary">{p.accessType}</span></td>
                <td className="px-4 py-3">
                  <a href={`/admin/packages?productId=${p.id}`} className="text-primary hover:underline">{p._count?.packages ?? 0}</a>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${p.isActive ? "bg-success/15 text-success" : "bg-error/15 text-error"}`}>{p.isActive ? "on" : "off"}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => openEdit(p)}>Edit</button>
                    <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs text-error" onClick={() => onDelete(p)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-on-surface-variant">No products yet.</td></tr>
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
