import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PaymentGatewayKeys } from "@smm/shared";
import {
  createAdminPaymentMethod,
  deleteAdminPaymentMethod,
  getAdminPaymentMethods,
  updateAdminPaymentMethod,
} from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

interface MethodItem {
  id: string;
  title: string;
  gatewayType: "AUTOMATED" | "MANUAL";
  accountType: string;
  accountNumber: string | null;
  instructions: string | null;
  minAmount: string;
  maxAmount: string;
  bonusPercent: string;
  gatewayProvider: string | null;
  status: "ACTIVE" | "DISABLED";
}

const emptyForm = {
  title: "",
  gatewayType: "MANUAL" as "AUTOMATED" | "MANUAL",
  accountType: "PERSONAL" as "PERSONAL" | "MERCHANT" | "AGENT",
  accountNumber: "",
  instructions: "",
  minAmount: "0.2",
  maxAmount: "1000",
  bonusPercent: "0",
  gatewayProvider: "" as string,
};

export default function AdminPaymentMethods() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: methods } = useQuery({ queryKey: ["admin-payment-methods"], queryFn: getAdminPaymentMethods });

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
  }

  // minAmount/maxAmount/bonusPercent are plain `type="number"` inputs bound
  // to string state — `Number("")` is 0, not NaN, so an emptied field would
  // otherwise silently submit as 0 instead of being caught as invalid. This
  // is exactly how a live payment method ended up with minAmount stuck at
  // $0 with no validation error anywhere. `required` already stops a fully
  // empty field from submitting at all; this catches the same field holding
  // a non-numeric leftover (e.g. just "-" or ".") that `Number()` would
  // otherwise also coerce to 0/NaN silently.
  function parseAmount(raw: string, label: string): number {
    const n = Number(raw);
    if (raw.trim() === "" || Number.isNaN(n)) {
      throw new Error(`${label} must be a valid number`);
    }
    return n;
  }

  function startEdit(m: MethodItem) {
    setEditingId(m.id);
    setForm({
      title: m.title,
      gatewayType: m.gatewayType,
      accountType: m.accountType as "PERSONAL" | "MERCHANT" | "AGENT",
      accountNumber: m.accountNumber ?? "",
      instructions: m.instructions ?? "",
      minAmount: m.minAmount,
      maxAmount: m.maxAmount,
      bonusPercent: m.bonusPercent,
      gatewayProvider: m.gatewayProvider ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        gatewayType: form.gatewayType,
        accountType: form.accountType,
        accountNumber: form.accountNumber || null,
        instructions: form.instructions || null,
        minAmount: parseAmount(form.minAmount, "Min amount"),
        maxAmount: parseAmount(form.maxAmount, "Max amount"),
        bonusPercent: parseAmount(form.bonusPercent, "Bonus %"),
        gatewayProvider: form.gatewayType === "AUTOMATED" ? (form.gatewayProvider as never) : null,
      };
      if (editingId) {
        await updateAdminPaymentMethod(editingId, payload);
        toast.push("Payment method updated.", "success");
      } else {
        await createAdminPaymentMethod({ ...payload, status: "ACTIVE", sortOrder: 0 });
        toast.push("Payment method created.", "success");
      }
      cancelEdit();
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err, editingId ? "Failed to update payment method" : "Failed to create payment method"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onToggleStatus(m: MethodItem) {
    try {
      await updateAdminPaymentMethod(m.id, { status: m.status === "ACTIVE" ? "DISABLED" : "ACTIVE" });
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to update method"), "error");
    }
  }

  async function onDelete(m: MethodItem) {
    try {
      await deleteAdminPaymentMethod(m.id);
      toast.push("Payment method deleted.", "success");
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to delete — try disabling it instead"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Payment Methods</h1>
      <p className="text-sm text-on-surface-variant">
        Every deposit option customers see on the Add Funds page — create as many as you need (e.g. two
        separate bKash Personal numbers), toggle them on/off instantly, and set a deposit bonus % per method.
      </p>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Min/Max</th>
              <th className="px-4 py-3">Bonus</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {methods?.map((m: MethodItem) => (
              <tr key={m.id}>
                <td className="px-4 py-3">{m.title}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${m.gatewayType === "AUTOMATED" ? "bg-primary/15 text-primary" : "bg-outline-variant/40 text-on-surface-variant"}`}>
                    {m.gatewayType === "AUTOMATED" ? m.gatewayProvider : "MANUAL"}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{m.accountNumber ?? "—"} <span className="text-on-surface-variant">({m.accountType})</span></td>
                <td className="px-4 py-3 font-mono text-xs">${m.minAmount} / ${m.maxAmount}</td>
                <td className="px-4 py-3 font-mono text-success">{m.bonusPercent}%</td>
                <td className="px-4 py-3">
                  <span className={`badge ${m.status === "ACTIVE" ? "bg-success/15 text-success" : "bg-outline-variant/40 text-on-surface-variant"}`}>{m.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => startEdit(m)}>Edit</button>
                    <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => onToggleStatus(m)}>
                      {m.status === "ACTIVE" ? "Disable" : "Enable"}
                    </button>
                    <button className="btn-ghost !px-3 !py-1.5 text-xs text-error" onClick={() => onDelete(m)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {methods?.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-on-surface-variant">No payment methods yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <form onSubmit={onSubmit} className="card max-w-lg space-y-3">
        <h2 className="text-sm font-semibold">{editingId ? "Edit payment method" : "Add payment method"}</h2>

        <div className="flex gap-2">
          <button type="button" onClick={() => setForm((f) => ({ ...f, gatewayType: "MANUAL" }))} className={`flex-1 rounded-md border px-3 py-2 text-sm ${form.gatewayType === "MANUAL" ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant"}`}>
            Manual
          </button>
          <button type="button" onClick={() => setForm((f) => ({ ...f, gatewayType: "AUTOMATED" }))} className={`flex-1 rounded-md border px-3 py-2 text-sm ${form.gatewayType === "AUTOMATED" ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant"}`}>
            Automated
          </button>
        </div>

        <input className="input-field" placeholder="Title (e.g. bKash Personal #1)" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />

        {form.gatewayType === "AUTOMATED" ? (
          <select className="input-field" value={form.gatewayProvider} onChange={(e) => setForm((f) => ({ ...f, gatewayProvider: e.target.value }))} required>
            <option value="" disabled>Select gateway…</option>
            {PaymentGatewayKeys.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        ) : (
          <>
            <select className="input-field" value={form.accountType} onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value as never }))}>
              <option value="PERSONAL">Personal</option>
              <option value="MERCHANT">Merchant</option>
              <option value="AGENT">Agent</option>
            </select>
            <input className="input-field" placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} required />
            <textarea className="input-field" rows={2} placeholder="Instructions shown to the customer" value={form.instructions} onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))} />
          </>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input className="input-field" type="number" step="0.01" placeholder="Min amount" value={form.minAmount} onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))} required />
          <input className="input-field" type="number" step="0.01" placeholder="Max amount" value={form.maxAmount} onChange={(e) => setForm((f) => ({ ...f, maxAmount: e.target.value }))} required />
          <input className="input-field" type="number" step="0.01" placeholder="Bonus %" value={form.bonusPercent} onChange={(e) => setForm((f) => ({ ...f, bonusPercent: e.target.value }))} required />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1" disabled={submitting}>
            {submitting ? "Saving…" : editingId ? "Save changes" : "Create payment method"}
          </button>
          {editingId && (
            <button type="button" className="btn-ghost" onClick={cancelEdit} disabled={submitting}>Cancel</button>
          )}
        </div>
      </form>
    </div>
  );
}
