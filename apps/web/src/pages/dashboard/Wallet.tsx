import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createDeposit, getEnabledGateways, getMyDeposits, getWallet, initiateGatewayDeposit } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

const METHODS = ["bKash", "Nagad", "Rocket", "Upay", "Other"];

export default function Wallet() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: getWallet });
  const { data: deposits } = useQuery({ queryKey: ["deposits"], queryFn: () => getMyDeposits({ page: 1, pageSize: 20 }) });
  const { data: enabledGateways } = useQuery({ queryKey: ["enabled-gateways"], queryFn: getEnabledGateways });

  const [method, setMethod] = useState(METHODS[0]);
  const [amount, setAmount] = useState<number | "">("");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function onPayWithGateway(gateway: "BKASH") {
    if (!amount) {
      setError("Enter an amount first");
      return;
    }
    setGatewayLoading(true);
    setError(null);
    try {
      const redirectUrl = await initiateGatewayDeposit(gateway, { amount: Number(amount) });
      window.location.href = redirectUrl;
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to start payment"));
      setGatewayLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);
    setError(null);
    try {
      await createDeposit({ method: method!, amount: Number(amount), reference: reference || undefined });
      toast.push("Deposit request submitted — pending admin approval.", "success");
      setAmount("");
      setReference("");
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
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {deposits?.items.map((d: { id: string; createdAt: string; method: string; amount: string; status: string }) => (
                <tr key={d.id}>
                  <td className="py-2 text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                  <td className="py-2">{d.method}</td>
                  <td className="py-2 font-mono">${d.amount}</td>
                  <td className="py-2"><span className="badge bg-warning/15 text-warning">{d.status}</span></td>
                </tr>
              ))}
              {deposits?.items.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-on-surface-variant">No deposits yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card h-fit space-y-4">
        <h2 className="text-lg font-bold">Add Funds</h2>
        {error && <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}
        <div>
          <label className="label">Payment method</label>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMethod(m)}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  method === m ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="amount">Amount (USD)</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min={0.2}
            className="input-field"
            value={amount}
            onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="reference">Transaction reference (optional)</label>
          <input id="reference" className="input-field" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        {enabledGateways?.includes("BKASH") && method === "bKash" && (
          <button
            type="button"
            className="btn-primary w-full !bg-bkash"
            disabled={gatewayLoading}
            onClick={() => onPayWithGateway("BKASH")}
          >
            {gatewayLoading ? "Redirecting…" : "Pay instantly with bKash"}
          </button>
        )}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit deposit request"}
        </button>
        <p className="text-xs text-on-surface-variant">
          {enabledGateways?.includes("BKASH") && method === "bKash"
            ? "\"Pay instantly\" credits your balance automatically once bKash confirms payment. The form below submits a manual request instead, reviewed by an admin."
            : "Deposits are reviewed by an admin and credited once verified."}
          {" "}Minimum deposit $0.20.
          <br />
          ন্যূনতম ডিপোজিট $0.20। যাচাই হওয়ার পর ব্যালেন্স যোগ হবে।
        </p>
      </form>
    </div>
  );
}
