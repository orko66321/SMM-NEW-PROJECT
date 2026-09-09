import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  getEnabledGateways,
  getPublicCategories,
  getPublicServices,
  getPublicSettings,
  getPublicSiteNotice,
  getWallet,
  initiateGatewayDeposit,
  placeOrder,
} from "../../api/resources.js";
import { usePlatformFilter } from "./usePlatformFilter.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";
import { useCurrency } from "../../context/CurrencyContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { pickLang } from "../../i18n/pickLang.js";
import { AuthPromptModal } from "../../components/auth/GuestGate.js";
import HowToOrderLink from "../../components/HowToOrderLink.js";
import RecentlyCompleted from "../../components/services/RecentlyCompleted.js";
import SubscriptionStrip from "../../components/store/SubscriptionStrip.js";
import { BilingualNote, Icon } from "../../components/ds/index.js";
import "../../styles/new-order.css";

// Shape of the 402 response body order.service.ts's createOrderOrRedirect
// throws when the wallet can't cover the charge (see AppError's `details`).
interface InsufficientFundsDetails {
  orderIntentId: string;
  kind?: "SERVICE" | "PACKAGE";
  charge: string;
  balance: string;
  shortfall: string;
}

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  nameBn: string | null;
  descriptionBn: string | null;
  categoryId: string;
  sellPricePer1000: string;
  minQuantity: number;
  maxQuantity: number;
  refillEnabled: boolean;
  cancelEnabled: boolean;
  avgCompletionSeconds: number | null;
  lastCompletedAt: string | null;
}

// A guest who fills this form out and only then hits "Place Order" gets
// bounced through /login or /register and back — a full route change that
// would otherwise unmount this component and lose everything they typed.
// This is the one-shot sessionStorage draft that survives that round trip:
// written right before the redirect, read back (and cleared) on the next
// mount. Per-tab only and never sent anywhere — plain form-recovery, not
// state that needs to persist reliably or be shared.
const DRAFT_KEY = "smm_guest_order_draft";

interface OrderDraft {
  categoryId?: string;
  serviceId?: string;
  link?: string;
  quantity?: number | "";
}

function saveDraft(draft: OrderDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // storage unavailable (private mode, quota) — the auth prompt still
    // works, the form just won't be pre-filled on return
  }
}

// Deliberately read-only, no sessionStorage.removeItem here — this runs as
// a useState lazy initializer below, and React 18 StrictMode invokes lazy
// initializers twice on mount (dev only) to help surface exactly this kind
// of impurity: a clear-on-read here would make the *second* invocation
// silently read back nothing, so the draft never actually restores. The
// one-shot clear happens separately, in a plain useEffect (see below).
function readDraft(): OrderDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as OrderDraft) : null;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // storage unavailable — nothing to clear
  }
}

export default function NewOrder() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { formatCurrency } = useCurrency();
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [draft] = useState(readDraft);
  useEffect(() => {
    if (draft) clearDraft();
    // One-shot: only ever needs to run once, against the draft this
    // component mounted with — re-running on `draft` changing isn't a
    // thing (it's never reassigned after the initial useState call).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { data: siteNotice } = useQuery({ queryKey: ["public-site-notice"], queryFn: getPublicSiteNotice, staleTime: 60_000 });
  const { data: publicSettings } = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 60_000 });
  // Wallet balance widget at the top of the form — authed users only (the
  // guest flow never shows a balance). Same ["wallet"] key the rest of the
  // dashboard uses, so it's usually already warm on navigation.
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: getWallet, enabled: !!user });

  // Public (unauthenticated) catalog endpoints — same underlying data as
  // the authed /services ones, so browsing/pricing this form works
  // identically for a guest and a logged-in user. Only the final "Place
  // Order" submit is gated (see onSubmit below).
  const { data: categories } = useQuery({ queryKey: ["public-categories"], queryFn: getPublicCategories });
  const [categoryId, setCategoryId] = useState<string>(draft?.categoryId ?? "");
  // `?platform=<slug>` deep link from the Overview PlatformShortcuts — narrows
  // the Category list and auto-picks the first match so Service cascades.
  const { platformLabel, visibleCategories, isFiltered, clearFilter } = usePlatformFilter(
    categories,
    categoryId,
    setCategoryId,
  );
  const { data: servicesData } = useQuery({
    queryKey: ["public-services", categoryId],
    queryFn: () => getPublicServices({ page: 1, pageSize: 100, categoryId: categoryId || undefined }),
  });
  const { data: enabledGateways } = useQuery({ queryKey: ["enabled-gateways"], queryFn: getEnabledGateways, staleTime: 60_000 });
  const zinipayEnabled = (enabledGateways ?? []).includes("ZINIPAY");

  const services: ServiceItem[] = useMemo(() => servicesData?.items ?? [], [servicesData]);
  const [serviceId, setServiceId] = useState<string>(searchParams.get("serviceId") ?? draft?.serviceId ?? "");
  const [link, setLink] = useState(draft?.link ?? "");
  const [quantity, setQuantity] = useState<number | "">(draft?.quantity ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const estimatedCharge = useMemo(() => {
    if (!selectedService || !quantity) return "0.00";
    return ((Number(selectedService.sellPricePer1000) * Number(quantity)) / 1000).toFixed(4);
  }, [selectedService, quantity]);

  // Quantity stepper (− / +) — first tap off an empty field lands on the
  // service's minimum; every tap after that moves by 100 and stays clamped
  // to [min, max]. Typing in the field still works exactly as before.
  const stepQty = (dir: 1 | -1) => {
    if (!selectedService) return;
    setQuantity((q) => {
      if (typeof q !== "number") return selectedService.minQuantity;
      const next = q + dir * 100;
      return Math.min(selectedService.maxQuantity, Math.max(selectedService.minQuantity, next));
    });
  };

  // Falls back to whichever language actually has content, rather than
  // showing a blank box when an admin has only filled in one language.
  const noticeTitle = lang === "bn"
    ? siteNotice?.titleBn || siteNotice?.titleEn
    : siteNotice?.titleEn || siteNotice?.titleBn;
  const noticeBody = lang === "bn"
    ? siteNotice?.bodyBn || siteNotice?.bodyEn
    : siteNotice?.bodyEn || siteNotice?.bodyBn;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedService || !quantity) return;
    if (quantity < selectedService.minQuantity || quantity > selectedService.maxQuantity) {
      setError(t("newOrder.quantityRangeError", { min: selectedService.minQuantity, max: selectedService.maxQuantity }));
      return;
    }
    // Soft-gate at the point of action, not on page load — the form itself
    // stays fully fillable for a guest (see GuestGate.tsx). The draft save
    // is what makes "only the actual write attempt needs a session" true in
    // practice: without it, clicking through to /login would unmount this
    // form and lose everything just typed.
    if (!user) {
      saveDraft({ categoryId, serviceId, link, quantity });
      setAuthPromptOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      await placeOrder({ serviceId: selectedService.id, link, quantity: Number(quantity) }, idempotencyKey);
      toast.push(t("newOrder.successToast"), "success");
      setLink("");
      setQuantity("");
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      // 402 = wallet can't cover the charge (see order.service.ts's
      // createOrderOrRedirect) — send the user straight to Add Funds
      // instead of just showing a static error, pre-filled with exactly
      // what's needed and carrying the orderIntentId so paying finishes
      // the job automatically (Wallet.tsx picks these up from the URL).
      if (axios.isAxiosError(err) && err.response?.status === 402) {
        const details = err.response.data?.details as InsufficientFundsDetails | undefined;
        if (details) {
          // Preferred path: straight into the ZiniPay checkout for the FULL
          // order price (the wallet's existing balance is left untouched);
          // the OrderIntent id rides along so the order places itself once
          // payment confirms. Falls back to the Wallet "Add Funds" page when
          // instant payment isn't available.
          if (zinipayEnabled) {
            toast.push(t("newOrder.insufficientPayToast"), "info");
            try {
              const redirectUrl = await initiateGatewayDeposit("ZINIPAY", {
                amount: Number(details.charge),
                orderIntentId: details.orderIntentId,
              });
              window.location.href = redirectUrl;
              return;
            } catch (payErr) {
              setError(apiErrorMessage(payErr, t("newOrder.payRedirectFailed")));
              return;
            }
          }
          toast.push(t("newOrder.insufficientToast"), "info");
          navigate(`/dashboard/wallet?orderIntentId=${details.orderIntentId}&required=${details.charge}`);
          return;
        }
      }
      // Session expired mid-fill (token lapsed between page load and
      // submit) — same graceful prompt as the pre-submit guest check above,
      // not a raw 401 error string.
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setAuthPromptOpen(true);
        return;
      }
      setError(apiErrorMessage(err, t("newOrder.failedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  const ctaLabel = submitting ? t("newOrder.submitting") : t("newOrder.submit");

  return (
    <div className="no-page" lang={lang}>
      <div className="mx-auto max-w-[1240px] min-w-0 space-y-6">
        {/* Page header */}
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d2bbff]">
            <span className="h-px w-5 bg-gradient-to-r from-[#d2bbff] to-transparent" />
            Dashboard · {t("newOrder.title")}
          </p>
          <h1 className="mt-2 font-headline text-[26px] font-bold leading-tight text-[#f4f2fb] sm:text-[34px]">
            {t("newOrder.title")}
          </h1>
          <p className="mt-1.5 max-w-[54ch] text-sm text-[#c7c4d7]">{t("newOrder.subtitle")}</p>
        </div>

        {/* Balance widget — authed users only */}
        {user && (
          <div
            className="no-glass relative overflow-hidden rounded-2xl border border-[#5de6ff]/25 p-5"
            style={{
              background:
                "radial-gradient(120% 130% at 100% 0%, rgba(93,230,255,0.12), transparent 55%), rgba(27,27,37,0.72)",
            }}
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#c7c4d7]">
                  {t("overview.walletBalance")}
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#8b8598]">
                    User Balance
                  </span>
                </div>
                <div className="mt-1.5 font-headline text-[32px] font-bold leading-none tracking-tight text-[#f4f2fb] sm:text-[38px]">
                  {formatCurrency(wallet?.balance ?? 0)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/dashboard/wallet")}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(124,58,237,0.45)] transition hover:-translate-y-px"
              >
                <Icon name="plus" size={16} />
                {t("dashboardLayout.nav.addFunds")}
              </button>
            </div>
          </div>
        )}

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="no-order-form" onSubmit={onSubmit} className="min-w-0 lg:col-span-2">
            <div className="no-glass rounded-2xl border border-[#2b2b36] p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2 border-b border-[#2b2b36] pb-3 font-headline text-[15px] font-semibold text-[#f4f2fb]">
                <Icon name="cart" size={18} className="text-[#d2bbff]" />
                {t("newOrder.orderDetails")}
              </div>

              <div className="space-y-4">
                {error && (
                  <p className="break-words rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/12 px-3 py-2 text-sm text-[#ffd7d7]">
                    {error}
                  </p>
                )}

                <BilingualNote
                  tone="warning"
                  en={t("bilingual.publicProfileEn")}
                  bn={t("bilingual.publicProfileBn")}
                />

                {/* Category */}
                <div>
                  <label
                    className="mb-2 flex flex-wrap items-baseline gap-2 text-[13px] font-semibold text-[#f4f2fb]"
                    htmlFor="category"
                  >
                    {t("newOrder.categoryLabel")}
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#5de6ff]">Category</span>
                  </label>
                  {isFiltered && platformLabel && (
                    <div className="mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d2bbff]/30 bg-[#7c3aed]/20 px-3 py-1 text-xs font-medium text-[#d2bbff]">
                        {t("newOrder.platformFilter", { platform: platformLabel })}
                        <button
                          type="button"
                          onClick={clearFilter}
                          aria-label={t("newOrder.clearPlatformFilter")}
                          className="-mr-1 rounded-full p-0.5 hover:bg-white/10"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="h-3 w-3">
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </button>
                      </span>
                    </div>
                  )}
                  <select
                    id="category"
                    className="no-field"
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      setServiceId("");
                    }}
                  >
                    <option value="">{t("newOrder.allCategories")}</option>
                    {visibleCategories.map((c: { id: string; name: string; platform: string }) => (
                      <option key={c.id} value={c.id}>{c.platform} — {c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Service */}
                <div>
                  <label
                    className="mb-2 flex flex-wrap items-baseline gap-2 text-[13px] font-semibold text-[#f4f2fb]"
                    htmlFor="service"
                  >
                    {t("newOrder.serviceLabel")}
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#5de6ff]">Service</span>
                  </label>
                  <select
                    id="service"
                    className="no-field"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    required
                  >
                    <option value="" disabled>{t("newOrder.selectService")}</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{pickLang(lang, s.nameBn, s.name)} — ${s.sellPricePer1000}/1000</option>
                    ))}
                  </select>
                  {selectedService && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedService.refillEnabled && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#22c55e]/35 bg-[#22c55e]/15 px-2.5 py-1 text-[11px] font-semibold text-[#7ee2a8]">
                          ↺ {t("newOrder.note2Label")}
                        </span>
                      )}
                      {!selectedService.cancelEnabled && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#f59e0b]/35 bg-[#f59e0b]/15 px-2.5 py-1 text-[11px] font-semibold text-[#f6c667]">
                          ⚠ {t("newOrder.note3Label")}
                        </span>
                      )}
                    </div>
                  )}
                  {selectedService && pickLang(lang, selectedService.descriptionBn, selectedService.description) && (
                    <p className="mt-2 whitespace-pre-line rounded-lg border border-[#2b2b36] bg-[#1b1b25] px-3 py-2 text-xs text-[#c7c4d7]">
                      {pickLang(lang, selectedService.descriptionBn, selectedService.description)}
                    </p>
                  )}
                  {selectedService && (
                    <div className="mt-2 rounded-lg border border-[#2b2b36] bg-[#1b1b25] px-4 py-3">
                      <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
                        <span className="text-[13px] font-semibold text-[#f4f2fb]">{t("completionTime.label")}</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-[#5de6ff]">Avg. Delivery</span>
                      </div>
                      <RecentlyCompleted
                        serviceId={selectedService.id}
                        avgCompletionSeconds={selectedService.avgCompletionSeconds}
                        lastCompletedAt={selectedService.lastCompletedAt}
                        windowHours={publicSettings?.recentlyCompletedWindowHours ?? null}
                        variant="cell"
                      />
                    </div>
                  )}
                </div>

                {/* Link */}
                <div>
                  <label
                    className="mb-2 flex flex-wrap items-baseline gap-2 text-[13px] font-semibold text-[#f4f2fb]"
                    htmlFor="link"
                  >
                    {t("newOrder.linkLabel")}
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#5de6ff]">Link</span>
                  </label>
                  <input
                    id="link"
                    className="no-field"
                    placeholder={t("newOrder.linkPlaceholder")}
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    required
                  />
                  <BilingualNote
                    className="mt-2"
                    tone="info"
                    en={t("bilingual.linkFormatEn")}
                    bn={t("bilingual.linkFormatBn")}
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label
                    className="mb-2 flex flex-wrap items-baseline gap-2 text-[13px] font-semibold text-[#f4f2fb]"
                    htmlFor="quantity"
                  >
                    {t("newOrder.quantityLabel")}
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#5de6ff]">Quantity</span>
                    {selectedService && (
                      <span className="text-[11px] font-medium normal-case text-[#8b8598]">
                        {t("newOrder.minMax", { min: selectedService.minQuantity, max: selectedService.maxQuantity })}
                      </span>
                    )}
                  </label>
                  <div className="flex items-stretch gap-2" style={{ maxWidth: 260 }}>
                    <button
                      type="button"
                      className="no-step"
                      aria-label="−"
                      disabled={!selectedService}
                      onClick={() => stepQty(-1)}
                    >
                      −
                    </button>
                    <input
                      id="quantity"
                      type="number"
                      className="no-field"
                      style={{ textAlign: "center", fontWeight: 600 }}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : "")}
                      min={selectedService?.minQuantity}
                      max={selectedService?.maxQuantity}
                      required
                    />
                    <button
                      type="button"
                      className="no-step"
                      aria-label="+"
                      disabled={!selectedService}
                      onClick={() => stepQty(1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total charge */}
                <div className="no-total shadow-[0_0_22px_-6px_rgba(124,58,237,0.5)]">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-[15px] bg-gradient-to-b from-[#1c1a2e] to-[#161428] px-5 py-4">
                    <span className="text-[13px] font-semibold text-[#c7c4d7]">
                      {t("newOrder.estimatedCharge")}
                      <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.14em] text-[#8b8598]">
                        Total Charge
                      </span>
                    </span>
                    <span className="font-headline text-[28px] font-bold tracking-tight text-[#f4f2fb]">
                      {formatCurrency(estimatedCharge)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="no-cta flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full font-headline text-[15px] font-semibold text-white"
                  disabled={submitting || !selectedService}
                >
                  <Icon name="arrow-right" size={18} />
                  {ctaLabel}
                </button>

                {/* Optional admin-configured tutorial link — hides itself when unset. */}
                <div className="pt-0.5 text-center">
                  <HowToOrderLink />
                </div>
              </div>
            </div>
          </form>

          <div className="min-w-0 space-y-5">
            {/* Service rules & guidance — always shown */}
            <div className="no-glass rounded-2xl border border-[#2b2b36] p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-[#2b2b36] pb-3 font-headline text-[14px] font-semibold text-[#f4f2fb]">
                <span className="h-1.5 w-1.5 rounded-[2px] bg-[#5de6ff] shadow-[0_0_8px_#5de6ff]" />
                {t("newOrder.rulesTitle")}
              </div>
              <ul className="space-y-3 text-[13px] leading-relaxed text-[#c7c4d7]">
                <li className="flex gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-[#ef4444]/45 bg-[#ef4444]/16 text-[11px] font-extrabold text-[#ff9c9c]">!</span>
                  <span>{t("newOrder.note4")}</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-[#5de6ff]/40 bg-[#5de6ff]/14 text-[11px] font-extrabold text-[#5de6ff]">i</span>
                  <span>{t("newOrder.note1")}</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-[#22c55e]/40 bg-[#22c55e]/16 text-[11px] font-extrabold text-[#7ee2a8]">↺</span>
                  <span>
                    <b className="text-[#f4f2fb]">{t("newOrder.note2Label")}</b> — {t("newOrder.note2")}
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-[#f59e0b]/45 bg-[#f59e0b]/16 text-[11px] font-extrabold text-[#f6c667]">×</span>
                  <span>
                    <b className="text-[#f4f2fb]">{t("newOrder.note3Label")}</b> — {t("newOrder.note3")}
                  </span>
                </li>
              </ul>
            </div>

            {(noticeTitle || noticeBody) && (
              <div className="no-glass rounded-2xl border border-[#2b2b36] p-5">
                {noticeTitle && (
                  <div className="mb-3 flex items-center gap-2 border-b border-[#2b2b36] pb-3 font-headline text-[14px] font-semibold text-[#f4f2fb]">
                    <Icon name="campaign" size={18} className="text-[#d2bbff]" />
                    {noticeTitle}
                  </div>
                )}
                {noticeBody && (
                  <p className="whitespace-pre-line break-words text-[13px] leading-relaxed text-[#c7c4d7]">{noticeBody}</p>
                )}
              </div>
            )}
          </div>

          {/* Cross-sell: subscription products from the Store, same wallet
              balance. Renders nothing when the panel sells no subscriptions. */}
          <SubscriptionStrip />
        </div>
      </div>

      <AuthPromptModal
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        title={t("newOrder.authPromptTitle")}
        body={t("newOrder.authPromptBody")}
      />
    </div>
  );
}
