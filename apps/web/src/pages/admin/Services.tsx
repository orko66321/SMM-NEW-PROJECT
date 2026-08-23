import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminCategory,
  createAdminService,
  getAdminCategories,
  getAdminServices,
  updateAdminService,
} from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

const emptyForm = {
  categoryId: "",
  name: "",
  sellPricePer1000: "",
  providerCostPer1000: "",
  minQuantity: "100",
  maxQuantity: "10000",
  refillEnabled: false,
  cancelEnabled: false,
};

export default function AdminServices() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: categories } = useQuery({ queryKey: ["admin-categories"], queryFn: getAdminCategories });
  const { data: services } = useQuery({ queryKey: ["admin-services"], queryFn: () => getAdminServices({ page: 1, pageSize: 100 }) });

  const [form, setForm] = useState(emptyForm);
  const [newCategory, setNewCategory] = useState({ name: "", platform: "" });
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
  }

  async function onCreateCategory(e: FormEvent) {
    e.preventDefault();
    try {
      await createAdminCategory(newCategory);
      toast.push("Category created.", "success");
      setNewCategory({ name: "", platform: "" });
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to create category"), "error");
    }
  }

  async function onCreateService(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAdminService({
        categoryId: form.categoryId,
        name: form.name,
        sellPricePer1000: Number(form.sellPricePer1000),
        providerCostPer1000: Number(form.providerCostPer1000),
        minQuantity: Number(form.minQuantity),
        maxQuantity: Number(form.maxQuantity),
        refillEnabled: form.refillEnabled,
        cancelEnabled: form.cancelEnabled,
        status: "ACTIVE",
      });
      toast.push("Service created.", "success");
      setForm(emptyForm);
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to create service"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleServiceStatus(id: string, status: string) {
    try {
      await updateAdminService(id, { status: status === "ACTIVE" ? "DISABLED" : "ACTIVE" });
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to update service"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Services</h1>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Sell / 1000</th>
              <th className="px-4 py-3">Cost / 1000</th>
              <th className="px-4 py-3">Min/Max</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {services?.items.map((s: { id: string; name: string; category: { name: string }; sellPricePer1000: string; providerCostPer1000: string; minQuantity: number; maxQuantity: number; status: string }) => (
              <tr key={s.id}>
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3 text-on-surface-variant">{s.category.name}</td>
                <td className="px-4 py-3 font-mono text-success">${s.sellPricePer1000}</td>
                <td className="px-4 py-3 font-mono text-on-surface-variant">${s.providerCostPer1000}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.minQuantity}/{s.maxQuantity}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${s.status === "ACTIVE" ? "bg-success/15 text-success" : "bg-outline-variant/40 text-on-surface-variant"}`}>{s.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => toggleServiceStatus(s.id, s.status)}>
                    {s.status === "ACTIVE" ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={onCreateCategory} className="card space-y-3">
          <h2 className="text-sm font-semibold">New category</h2>
          <input className="input-field" placeholder="Name" value={newCategory.name} onChange={(e) => setNewCategory((f) => ({ ...f, name: e.target.value }))} required />
          <input className="input-field" placeholder="Platform (e.g. Instagram)" value={newCategory.platform} onChange={(e) => setNewCategory((f) => ({ ...f, platform: e.target.value }))} required />
          <button type="submit" className="btn-ghost w-full">Add category</button>
        </form>

        <form onSubmit={onCreateService} className="card space-y-3">
          <h2 className="text-sm font-semibold">New service</h2>
          <select className="input-field" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} required>
            <option value="" disabled>Select category…</option>
            {categories?.map((c: { id: string; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input-field" placeholder="Service name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-2">
            <input className="input-field" type="number" step="0.0001" placeholder="Sell price/1000" value={form.sellPricePer1000} onChange={(e) => setForm((f) => ({ ...f, sellPricePer1000: e.target.value }))} required />
            <input className="input-field" type="number" step="0.0001" placeholder="Provider cost/1000" value={form.providerCostPer1000} onChange={(e) => setForm((f) => ({ ...f, providerCostPer1000: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="input-field" type="number" placeholder="Min qty" value={form.minQuantity} onChange={(e) => setForm((f) => ({ ...f, minQuantity: e.target.value }))} required />
            <input className="input-field" type="number" placeholder="Max qty" value={form.maxQuantity} onChange={(e) => setForm((f) => ({ ...f, maxQuantity: e.target.value }))} required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.refillEnabled} onChange={(e) => setForm((f) => ({ ...f, refillEnabled: e.target.checked }))} /> Refill enabled
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.cancelEnabled} onChange={(e) => setForm((f) => ({ ...f, cancelEnabled: e.target.checked }))} /> Cancel enabled
          </label>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>{submitting ? "Creating…" : "Create service"}</button>
        </form>
      </div>
    </div>
  );
}
