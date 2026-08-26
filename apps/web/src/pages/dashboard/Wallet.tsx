import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createDeposit, getMyDeposits, getPaymentMethods, getPublicSettings, getWallet, initiateGatewayDeposit, validateCoupon } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { useCurrency } from "../../context/CurrencyContext.js";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore silently
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      title={copied ? "Copied!" : label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container-highest hover:text-on-surface"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-success">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" />
        </svg>
      )}
    </button>
  );
}

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
  const { formatCurrency } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: getWallet });
  const { data: deposits } = useQuery({ queryKey: ["deposits"], queryFn: () => getMyDeposits({ page: 1, pageSize: 20 }) });
  const { data: methods } = useQuery({ queryKey: ["payment-methods"], queryFn: getPaymentMethods });
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 60_000 });
  const bdtRate = settings?.usdToBdtRate ? Number(settings.usdToBdtRate) : null;

  // Set when arriving here via NewOrder's insufficient-balance redirect
  // (?orderIntentId=...&required=...) — carried through to
  // initiateGatewayDeposit so the backend can auto-place the order once
  // this deposit is confirmed (see order.service.ts's fulfillOrderIntent).
  const orderIntentId = searchParams.get("orderIntentId") ?? undefined;
  const requiredAmount = searchParams.get("required");

  const [selectedId, setSelectedId] = useState<string>("");
  const [amount, setAmount] = useState<number | "">(requiredAmount ? Number(requiredAmount) : "");
  const [trxId, setTrxId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState("");
  const [couponBonus, setCouponBonus] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const selected: PaymentMethodItem | undefined = useMemo(
    () => methods?.find((m: PaymentMethodItem) => m.id === selectedId),
    [methods, selectedId],
  );

  useEffect(() => {
    if (selectedId || !methods?.length) return;
    // Coming from the insufficient-balance redirect: prefer an AUTOMATED
    // method so paying actually completes the order automatically, instead
    // of falling into the admin-approval manual-deposit queue.
    if (orderIntentId) {
      const automated = methods.find((m: PaymentMethodItem) => m.gatewayType === "AUTOMATED");
      if (automated) {
        setSelectedId(automated.id);
        return;
      }
    }
    setSelectedId(methods[0].id);
  }, [methods, selectedId, orderIntentId]);

  // A coupon's bonus preview is specific to the amount it was checked
  // against — if the user edits the amount afterward, the stale preview
  // must not silently ride along into the submission.
  useEffect(() => {
    setCouponBonus(null);
    setCouponError(null);
  }, [amount]);

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
    // Covers the insufficient-balance-redirect path — if an OrderIntent
    // just got auto-fulfilled alongside this deposit credit, this refreshes
    // the Orders page's cache to show it without a manual reload.
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    setSearchParams((p) => {
      p.delete("deposit");
      p.delete("orderIntentId");
      p.delete("required");
      return p;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onApplyCoupon() {
    if (!couponCode.trim() || !amount) return;
    setCheckingCoupon(true);
    setCouponError(null);
    setCouponBonus(null);
    try {
      const result = await validateCoupon(couponCode.trim(), Number(amount));
      setCouponBonus(result.bonusAmount);
    } catch (err) {
      setCouponError(apiErrorMessage(err, "Invalid coupon code"));
    } finally {
      setCheckingCoupon(false);
    }
  }

  function resetCoupon() {
    setCouponCode("");
    setCouponBonus(null);
    setCouponError(null);
  }

  async function onPayAutomated() {
    if (!selected || !amount) return;
    setSubmitting(true);
    setError(null);
    try {
      const redirectUrl = await initiateGatewayDeposit(selected.gatewayProvider as never, {
        amount: Number(amount),
        paymentMethodId: selected.id,
        couponCode: couponBonus ? couponCode.trim() : undefined,
        orderIntentId,
      });
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
      await createDeposit({
        paymentMethodId: selected.id,
        amount: Number(amount),
        trxId,
        senderNumber,
        couponCode: couponBonus ? couponCode.trim() : undefined,
      });
      toast.push("Deposit request submitted — pending admin approval.", "success");
      setAmount("");
      setTrxId("");
      setSenderNumber("");
      resetCoupon();
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
          <p className="font-mono text-3xl font-bold text-success">{formatCurrency(wallet?.balance ?? 0)}</p>
        </div>

        <div className="card overflow-x-auto">
          <h2 className="mb-3 text-sm font-semibold">Fund history</h2>
          <table className="w-full min-w-[520px] text-sm">
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
                  <td className="py-2 font-mono">{formatCurrency(d.amount)}</td>
                  <td className="py-2 font-mono text-success">{Number(d.bonusAmount) > 0 ? `+${formatCurrency(d.bonusAmount)}` : "—"}</td>
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
        {orderIntentId && (
          <p className="rounded-md bg-primary/15 px-3 py-2 text-sm text-primary">
            You need {requiredAmount ? formatCurrency(requiredAmount) : "more funds"} to place that order — pay
            below and it'll be submitted automatically once confirmed.
          </p>
        )}
        {error && <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}

        <div>
          <label className="label">Payment method</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {methods?.map((m: PaymentMethodItem) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={`flex min-h-[44px] flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium ${
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
              <label className="label flex flex-wrap items-baseline gap-x-1.5" htmlFor="amount">
                <span>Amount (USD)</span>
                <span className="normal-case text-on-surface-variant">(Min: ${selected.minAmount} / Max: ${selected.maxAmount})</span>
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
              {/* Every gateway here (ZiniPay, bKash) is BDT-only — the amount
                  above is always USD, converted server-side right before the
                  gateway call (see apps/api/src/services/payments/currency.ts).
                  Shown so the actual local-currency charge isn't a surprise. */}
              {selected.gatewayType === "AUTOMATED" && bdtRate && amount && (
                <p className="mt-1.5 text-xs text-on-surface-variant">
                  You will pay: <span className="font-mono font-semibold text-on-surface">৳{(Number(amount) * bdtRate).toFixed(2)}</span>{" "}
                  (Exchange rate: $1 = ৳{bdtRate})
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="couponCode">Coupon / promo code (optional)</label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="couponCode"
                  className="input-field min-w-0 flex-1"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponBonus(null);
                    setCouponError(null);
                  }}
                  placeholder="e.g. WELCOME10"
                />
                <button
                  type="button"
                  className="btn-ghost shrink-0"
                  disabled={!couponCode.trim() || !amount || checkingCoupon}
                  onClick={onApplyCoupon}
                >
                  {checkingCoupon ? "Checking…" : "Apply"}
                </button>
              </div>
              {couponError && <p className="mt-1 text-xs text-error">{couponError}</p>}
              {couponBonus && (
                <p className="mt-1 text-xs text-success">
                  Coupon applied — you&apos;ll get an extra {formatCurrency(couponBonus)} once this deposit is credited.
                </p>
              )}
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
                  <div className="flex items-center justify-between gap-2 rounded-md bg-surface-container-high px-3 py-2">
                    <div className="min-w-0">
                      <span className="block text-xs text-on-surface-variant">Send to ({selected.accountType})</span>
                      <span className="block truncate font-mono font-semibold">{selected.accountNumber}</span>
                    </div>
                    <CopyButton value={selected.accountNumber} label="Copy account number" />
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
