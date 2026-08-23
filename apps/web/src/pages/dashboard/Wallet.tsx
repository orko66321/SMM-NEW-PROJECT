import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createDeposit, getMyDeposits, getPaymentMethods, getWallet, initiateGatewayDeposit } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

interface PaymentMethodItem {
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
}

export default function Wallet() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: getWallet });
  const { data: deposits } = useQuery({ queryKey: ["deposits"], queryFn: () => getMyDeposits({ page: 1, pageSize: 20 }) });
  const { data: methods } = useQuery({ queryKey: ["payment-methods"], queryFn: getPaymentMethods });

  const [selectedId, setSelectedId] = useState<string>("");
  const [amount, setAmount] = useState<number | "">("");
  const [trxId, setTrxId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected: PaymentMethodItem | undefined = useMemo(
    () => methods?.find((m: PaymentMethodItem) => m.id === selectedId),
    [methods, selectedId],
  );

  useEffect(() => {
    if (!selectedId && methods?.length) setSelectedId(methods[0].id);
  }, [methods, selectedId]);

  useEffect(() => {
    const outcome = searchParams.get("deposit");
    if (!outcome) return;
    const messages: Record<string, [string, "success" | "error"]> = {
      success: ["Payment confirmed — your balance has been updated.", "success"],
      pending: ["Payment is still processing — we'll credit it as soon as it's confirmed.", "error"],
      failed: ["Payment was not completed.", "error"],
      error: ["Something went wrong confirming the payment. Contact support if you were charged.", "error"],
    };
    const [message, variant] = messages[outcome] ?? ["Payment status unknown.", "error"];
    toast.push(message, variant);
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
    queryClient.invalidateQueries({ queryKey: ["deposits"] });
    setSearchParams((p) => {
      p.delete("deposit");
      return p;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onPayAutomated() {
    if (!selected || !amount) return;
    setSubmitting(true);
    setError(null);
    try {
      const redirectUrl = await initiateGatewayDeposit(selected.gatewayProvider as never, { amount: Number(amount), paymentMethodId: selected.id });
      window.location.href = redirectUrl;
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to start payment"));
      setSubmitting(false);
    }
  }

  async function onSubmitManual(e: FormEvent) {
    e.preventDefault();
    if (!selected || !amount) return;
    setSubmitting(true);
    setError(null);
    try {
      await createDeposit({ paymentMethodId: selected.id, amount: Number(amount), trxId, senderNumber });
      toast.push("Deposit request submitted — pending admin approval.", "success");
      setAmount("");
      setTrxId("");
      setSenderNumber("");
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to submit deposit"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="card">
          <p className="label">Current Balance</p>
          <p className="font-mono text-3xl font-bold text-success">${wallet?.balance ?? "0.00"}</p>
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold">Fund history</h2>
          <table className="w-full text-sm">
            <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2">Method</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Bonus</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {deposits?.items.map((d: { id: string; createdAt: string; method: string; amount: string; bonusAmount: string; status: string }) => (
                <tr key={d.id}>
                  <td className="py-2 text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                  <td className="py-2">{d.method}</td>
                  <td className="py-2 font-mono">${d.amount}</td>
                  <td className="py-2 font-mono text-success">{Number(d.bonusAmount) > 0 ? `+$${d.bonusAmount}` : "—"}</td>
                  <td className="py-2">
                    <span className={`badge ${d.status === "APPROVED" ? "bg-success/15 text-success" : d.status === "REJECTED" ? "bg-error/15 text-error" : "bg-warning/15 text-warning"}`}>{d.status}</span>
                  </td>
                </tr>
              ))}
              {deposits?.items.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-on-surface-variant">No deposits yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card h-fit space-y-4">
        <h2 className="text-lg font-bold">Add Funds</h2>
        {error && <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}

        <div>
          <label className="label">Payment method</label>
          <div className="grid grid-cols-1 gap-2">
            {methods?.map((m: PaymentMethodItem) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-medium ${
                  selectedId === m.id ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant"
                }`}
              >
                <span>{m.title}</span>
                <span className="flex items-center gap-1.5">
                  {Number(m.bonusPercent) > 0 && <span className="badge bg-success/15 text-success">+{m.bonusPercent}%</span>}
                  {m.gatewayType === "AUTOMATED" && <span className="badge bg-primary/15 text-primary">Instant</span>}
                </span>
              </button>
            ))}
            {methods?.length === 0 && <p className="text-sm text-on-surface-variant">No payment methods are configured yet — contact support.</p>}
          </div>
        </div>

        {selected && (
          <>
            <div>
              <label className="label" htmlFor="amount">
                Amount (USD) <span className="normal-case text-on-surface-variant">(Min: ${selected.minAmount} / Max: ${selected.maxAmount})</span>
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min={Number(selected.minAmount)}
                max={Number(selected.maxAmount)}
                className="input-field"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
                required
              />
            </div>

            {selected.gatewayType === "AUTOMATED" ? (
              <button type="button" className="btn-primary w-full" disabled={submitting || !amount} onClick={onPayAutomated}>
                {submitting ? "Redirecting…" : `Pay instantly via ${selected.gatewayProvider}`}
              </button>
            ) : (
              <form onSubmit={onSubmitManual} className="space-y-3">
                {selected.instructions && (
                  <p className="rounded-md bg-surface-container-high px-3 py-2 text-xs text-on-surface-variant">{selected.instructions}</p>
                )}
                {selected.accountNumber && (
                  <div className="flex items-center justify-between rounded-md bg-surface-container-high px-3 py-2">
                    <span className="text-xs text-on-surface-variant">Send to ({selected.accountType})</span>
                    <span className="font-mono font-semibold">{selected.accountNumber}</span>
                  </div>
                )}
                <div>
                  <label className="label" htmlFor="senderNumber">Your number</label>
                  <input id="senderNumber" className="input-field" value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} required />
                </div>
                <div>
                  <label className="label" htmlFor="trxId">Transaction ID</label>
                  <input id="trxId" className="input-field" value={trxId} onChange={(e) => setTrxId(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit deposit request"}
                </button>
                <p className="text-xs text-on-surface-variant">
                  Deposits are reviewed by an admin and credited once verified.
                  <br />
                  ডিপোজিট যাচাই হওয়ার পর ব্যালেন্স যোগ হবে।
                </p>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
