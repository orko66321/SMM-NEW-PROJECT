import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PaymentGatewayKeys } from "@smm/shared";
import { createDeposit, getMyDeposits, getPaymentMethods, getPublicSettings, getWallet, initiateGatewayDeposit, validateCoupon } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";
import { useCurrency } from "../../context/CurrencyContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { GuestLockedCard } from "../../components/auth/GuestGate.js";
import { BilingualNote, EmptyState, Icon, StatusBadge, WalletBalance } from "../../components/ds/index.js";

// A checkout-initiated gateway deposit (Store "Buy now" / New Order) has no
// admin-titled PaymentMethod behind it, so it falls back to storing the raw
// gateway key ("ZINIPAY") as Deposit.method — that's an internal/admin
// identifier, not something to show a customer. An admin-titled method
// (whatever they named it on the Add Funds picker) is left exactly as-is.
function displayDepositMethod(method: string, t: (key: string) => string): string {
  return (PaymentGatewayKeys as readonly string[]).includes(method) ? t("wallet.instantPaymentMethod") : method;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const { t } = useLanguage();
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
      title={copied ? t("common.copied") : label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-on-surface-variant transition hover:bg-surface-container-highest hover:text-on-surface"
    >
      <Icon name={copied ? "check" : "copy"} size={18} className={copied ? "text-success" : undefined} />
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
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: getWallet, enabled: !!user });
  const { data: deposits } = useQuery({ queryKey: ["deposits"], queryFn: () => getMyDeposits({ page: 1, pageSize: 20 }), enabled: !!user });
  const { data: methods } = useQuery({ queryKey: ["payment-methods"], queryFn: getPaymentMethods, enabled: !!user });
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
      success: [t("wallet.paymentConfirmedToast"), "success"],
      pending: [t("wallet.paymentPendingToast"), "error"],
      failed: [t("wallet.paymentFailedToast"), "error"],
      error: [t("wallet.paymentErrorToast"), "error"],
    };
    const [message, variant] = messages[outcome] ?? [t("wallet.paymentUnknownToast"), "error"];
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
      setCouponError(apiErrorMessage(err, t("wallet.couponInvalidFallback")));
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
      setError(apiErrorMessage(err, t("wallet.payFailedFallback")));
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
      toast.push(t("wallet.depositSubmittedToast"), "success");
      setAmount("");
      setTrxId("");
      setSenderNumber("");
      resetCoupon();
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
    } catch (err) {
      setError(apiErrorMessage(err, t("wallet.depositFailedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return <GuestLockedCard title={t("guestGate.pageTitle")} body={t("guestGate.walletBody")} />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <WalletBalance
          balance={formatCurrency(wallet?.balance ?? 0)}
          currency=""
          secondary={
            bdtRate && wallet?.balance != null
              ? `≈ ৳${(Number(wallet.balance) * bdtRate).toFixed(0)} · 1 USD = ${bdtRate}৳`
              : undefined
          }
        />

        <div>
          <h2 className="mb-3 text-sm font-semibold">{t("wallet.fundHistory")}</h2>

          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {deposits?.items.length === 0 && (
              <div className="card">
                <EmptyState icon="wallet" title={t("wallet.noDeposits")} />
              </div>
            )}
            {deposits?.items.map((d: { id: string; createdAt: string; method: string; amount: string; bonusAmount: string; status: string }) => (
              <div key={d.id} className="rounded-card border border-outline-variant bg-surface-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-on-surface">{displayDepositMethod(d.method, t)}</p>
                    <p className="mt-0.5 text-xs text-on-surface-variant">{new Date(d.createdAt).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={d.status} kind="deposit" className="shrink-0" />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-outline-variant pt-3 text-sm">
                  <span className="font-mono">{formatCurrency(d.amount)}</span>
                  <span className="font-mono text-success">
                    {Number(d.bonusAmount) > 0 ? t("wallet.bonusAmount", { amount: formatCurrency(d.bonusAmount) }) : t("wallet.noBonus")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop / tablet: table */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
                <tr>
                  <th className="py-2">{t("wallet.tableDate")}</th>
                  <th className="py-2">{t("wallet.tableMethod")}</th>
                  <th className="py-2">{t("wallet.tableAmount")}</th>
                  <th className="py-2">{t("wallet.tableBonus")}</th>
                  <th className="py-2">{t("wallet.tableStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {deposits?.items.map((d: { id: string; createdAt: string; method: string; amount: string; bonusAmount: string; status: string }) => (
                  <tr key={d.id}>
                    <td className="py-2 text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td className="py-2">{displayDepositMethod(d.method, t)}</td>
                    <td className="py-2 font-mono">{formatCurrency(d.amount)}</td>
                    <td className="py-2 font-mono text-success">{Number(d.bonusAmount) > 0 ? `+${formatCurrency(d.bonusAmount)}` : "—"}</td>
                    <td className="py-2">
                      <StatusBadge status={d.status} kind="deposit" />
                    </td>
                  </tr>
                ))}
                {deposits?.items.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-on-surface-variant">{t("wallet.noDeposits")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card h-fit space-y-4">
        <h2 className="text-lg font-bold">{t("wallet.addFunds")}</h2>
        {user && !user.hasDeposited && settings?.firstDepositBonusEnabled && Number(settings.firstDepositBonusPercent) > 0 && (
          <div className="rounded-control border border-success/30 bg-success/10 px-3 py-2.5 text-sm">
            <p className="font-semibold text-success">🎁 {t("wallet.firstDepositOfferTitle")}</p>
            <p className="mt-0.5 text-on-surface">
              {t("wallet.firstDepositOfferBody", {
                percent: settings.firstDepositBonusPercent,
                min: formatCurrency(settings.firstDepositMinAmount),
              })}
              {Number(settings.firstDepositMaxBonus) > 0 &&
                ` ${t("wallet.firstDepositOfferCap", { cap: formatCurrency(settings.firstDepositMaxBonus) })}`}
            </p>
          </div>
        )}
        {orderIntentId && (
          <p className="rounded-md bg-primary/15 px-3 py-2 text-sm text-primary">
            {requiredAmount
              ? t("wallet.orderIntentBanner", { amount: formatCurrency(requiredAmount) })
              : t("wallet.orderIntentBannerNoAmount")}
          </p>
        )}
        {error && <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}

        <div>
          <label className="label">{t("wallet.paymentMethodLabel")}</label>
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
                  {m.gatewayType === "AUTOMATED" && <span className="badge bg-primary/15 text-primary">{t("wallet.instant")}</span>}
                </span>
              </button>
            ))}
            {methods?.length === 0 && <p className="text-sm text-on-surface-variant">{t("wallet.noPaymentMethods")}</p>}
          </div>
        </div>

        {selected && (
          <>
            <div>
              <label className="label flex flex-wrap items-baseline gap-x-1.5" htmlFor="amount">
                <span>{t("wallet.amountLabel")}</span>
                <span className="normal-case text-on-surface-variant">{t("wallet.minMaxAmount", { min: selected.minAmount, max: selected.maxAmount })}</span>
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
                  {t("wallet.willPay")} <span className="font-mono font-semibold text-on-surface">৳{(Number(amount) * bdtRate).toFixed(2)}</span>{" "}
                  {t("wallet.exchangeRate", { rate: bdtRate })}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="couponCode">{t("wallet.couponLabel")}</label>
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
                  placeholder={t("wallet.couponPlaceholder")}
                />
                <button
                  type="button"
                  className="btn-ghost shrink-0"
                  disabled={!couponCode.trim() || !amount || checkingCoupon}
                  onClick={onApplyCoupon}
                >
                  {checkingCoupon ? t("wallet.checking") : t("wallet.apply")}
                </button>
              </div>
              {couponError && <p className="mt-1 text-xs text-error">{couponError}</p>}
              {couponBonus && (
                <p className="mt-1 text-xs text-success">
                  {t("wallet.couponApplied", { amount: formatCurrency(couponBonus) })}
                </p>
              )}
            </div>

            {selected.gatewayType === "AUTOMATED" ? (
              <button type="button" className="btn-primary w-full" disabled={submitting || !amount} onClick={onPayAutomated}>
                {submitting ? t("wallet.redirecting") : t("wallet.payInstantly")}
              </button>
            ) : (
              <form onSubmit={onSubmitManual} className="space-y-3">
                <BilingualNote
                  tone="warning"
                  en={t("bilingual.manualDepositEn")}
                  bn={t("bilingual.manualDepositBn")}
                />
                {selected.instructions && (
                  <p className="rounded-control bg-surface-container-high px-3 py-2 text-xs text-on-surface-variant">{selected.instructions}</p>
                )}
                {selected.accountNumber && (
                  <div className="flex items-center justify-between gap-2 rounded-md bg-surface-container-high px-3 py-2">
                    <div className="min-w-0">
                      <span className="block text-xs text-on-surface-variant">{t("wallet.sendTo", { accountType: selected.accountType })}</span>
                      <span className="block truncate font-mono font-semibold">{selected.accountNumber}</span>
                    </div>
                    <CopyButton value={selected.accountNumber} label={t("wallet.copyAccountNumber")} />
                  </div>
                )}
                <div>
                  <label className="label" htmlFor="senderNumber">{t("wallet.yourNumberLabel")}</label>
                  <input id="senderNumber" className="input-field" value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} required />
                </div>
                <div>
                  <label className="label" htmlFor="trxId">{t("wallet.transactionIdLabel")}</label>
                  <input id="trxId" className="input-field" value={trxId} onChange={(e) => setTrxId(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? t("wallet.submittingDeposit") : t("wallet.submitDeposit")}
                </button>
                <BilingualNote
                  tone="info"
                  en={t("bilingual.depositReviewEn")}
                  bn={t("bilingual.depositReviewBn")}
                />
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
