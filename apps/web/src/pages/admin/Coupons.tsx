import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CouponType } from "@smm/shared";
import { createAdminCoupon, deleteAdminCoupon, getAdminCoupons, updateAdminCoupon } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: string;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
}

export default function AdminCoupons() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: coupons } = useQuery({ queryKey: ["admin-coupons"], queryFn: getAdminCoupons });

  const [form, setForm] = useState({ code: "", type: "PERCENT" as CouponType, value: "10", maxUses: "", expiresAt: "" });
  const [submitting, setSubmitting] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAdminCoupon({
        code: form.code,
        type: form.type,
        value: Number(form.value),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
        active: true,
      });
      toast.push("Coupon created.", "success");
      setForm({ code: "", type: "PERCENT", value: "10", maxUses: "", expiresAt: "" });
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to create coupon"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onToggle(coupon: Coupon) {
    try {
      await updateAdminCoupon(coupon.id, { active: !coupon.active });
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to update coupon"), "error");
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteAdminCoupon(id);
      toast.push("Coupon deleted.", "success");
      invalidate();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to delete coupon — disable it instead if it has redemption history"), "error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-bold">Coupon Codes</h1>
      <p className="text-sm text-on-surface-variant">
        Redeemable once per user on the deposit page — credited as an extra bonus alongside the deposit, atomically
        with its approval.
      </p>

      <form onSubmit={onCreate} className="card grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          className="input-field sm:col-span-2"
          placeholder="Code, e.g. WELCOME10"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          required
        />
        <select className="input-field" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CouponType }))}>
          <option value="PERCENT">Percent (%)</option>
          <option value="FIXED">Fixed amount</option>
        </select>
        <input
          className="input-field"
          type="number"
          step="0.01"
          placeholder={form.type === "PERCENT" ? "e.g. 10 for 10%" : "e.g. 5 for $5"}
          value={form.value}
          onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
          required
        />
        <input
          className="input-field"
          type="number"
          placeholder="Max uses (optional)"
          value={form.maxUses}
          onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
        />
        <input
          className="input-field"
          type="date"
          value={form.expiresAt}
          onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
        />
        <button type="submit" className="btn-primary sm:col-span-2" disabled={submitting}>
          {submitting ? "Creating…" : "Create coupon"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-outline-variant">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-surface-container-high text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Uses</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {(coupons ?? []).map((c: Coupon) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-mono">{c.code}</td>
                <td className="px-4 py-3">{c.type === "PERCENT" ? `${c.value}%` : `$${c.value}`}</td>
                <td className="px-4 py-3 font-mono text-xs">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                <td className="px-4 py-3 text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${c.active ? "bg-success/15 text-success" : "bg-outline-variant/40 text-on-surface-variant"}`}>
                    {c.active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => onToggle(c)}>
                    {c.active ? "Disable" : "Enable"}
                  </button>
                  <button type="button" className="btn-ghost !px-2 !py-1 text-xs text-error" onClick={() => onDelete(c.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {coupons?.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-on-surface-variant">No coupons yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
