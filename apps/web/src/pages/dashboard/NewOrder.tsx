import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { getPublicCategories, getPublicServices, getPublicSiteNotice, placeOrder } from "../../api/resources.js";
import { usePlatformFilter } from "./usePlatformFilter.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { pickLang } from "../../i18n/pickLang.js";
import { AuthPromptModal } from "../../components/auth/GuestGate.js";
import HowToOrderLink from "../../components/HowToOrderLink.js";
import { BilingualNote, Card, Icon, ServiceTag } from "../../components/ds/index.js";

// Shape of the 402 response body order.service.ts's createOrderOrRedirect
// throws when the wallet can't cover the charge (see AppError's `details`).
interface InsufficientFundsDetails {
  orderIntentId: string;
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
          toast.push(t("newOrder.insufficientToast"), "info");
          navigate(`/dashboard/wallet?orderIntentId=${details.orderIntentId}&required=${details.shortfall}`);
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <form onSubmit={onSubmit} className="card space-y-4 lg:col-span-2">
        <h1 className="text-lg font-bold sm:text-xl">{t("newOrder.title")}</h1>
        {error && <p className="rounded-control border border-error/30 bg-error/15 px-3 py-2 text-sm text-error break-words">{error}</p>}

        <BilingualNote
          tone="warning"
          en={t("bilingual.publicProfileEn")}
          bn={t("bilingual.publicProfileBn")}
        />

        <div>
          <label className="label" htmlFor="category">{t("newOrder.categoryLabel")}</label>
          {isFiltered && platformLabel && (
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-accent-on-dark">
                {t("newOrder.platformFilter", { platform: platformLabel })}
                <button
                  type="button"
                  onClick={clearFilter}
                  aria-label={t("newOrder.clearPlatformFilter")}
                  className="-mr-1 rounded-full p-0.5 hover:bg-primary/20"
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
            className="input-field"
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

        <div>
          <label className="label" htmlFor="service">{t("newOrder.serviceLabel")}</label>
          <select id="service" className="input-field" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
            <option value="" disabled>{t("newOrder.selectService")}</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{pickLang(lang, s.nameBn, s.name)} — ${s.sellPricePer1000}/1000</option>
            ))}
          </select>
          {selectedService && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedService.refillEnabled && <ServiceTag label="Refill" />}
              {!selectedService.cancelEnabled && <ServiceTag label="No Cancel" />}
            </div>
          )}
          {selectedService && pickLang(lang, selectedService.descriptionBn, selectedService.description) && (
            <p className="mt-2 whitespace-pre-line rounded-md bg-surface-container-high px-3 py-2 text-xs text-on-surface-variant">
              {pickLang(lang, selectedService.descriptionBn, selectedService.description)}
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="link">{t("newOrder.linkLabel")}</label>
          <input
            id="link"
            className="input-field"
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

        <div>
          <label className="label flex flex-wrap items-baseline gap-x-1.5" htmlFor="quantity">
            <span>{t("newOrder.quantityLabel")}</span>
            {selectedService && (
              <span className="normal-case text-on-surface-variant">
                {t("newOrder.minMax", { min: selectedService.minQuantity, max: selectedService.maxQuantity })}
              </span>
            )}
          </label>
          <input
            id="quantity"
            type="number"
            className="input-field"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : "")}
            min={selectedService?.minQuantity}
            max={selectedService?.maxQuantity}
            required
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-outline-variant bg-surface-container-high px-4 py-3">
          <span className="label mb-0">{t("newOrder.estimatedCharge")}</span>
          <span className="font-mono text-lg font-semibold text-success">${estimatedCharge}</span>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting || !selectedService}>
          {submitting ? t("newOrder.submitting") : t("newOrder.submit")}
        </button>

        {/* Optional admin-configured tutorial link — hides itself when unset. */}
        <HowToOrderLink />
      </form>

      {(noticeTitle || noticeBody) && (
        <Card
          className="h-fit break-words text-sm text-on-surface-variant"
          header={
            noticeTitle ? (
              <>
                <Icon name="info" size={18} className="text-accent-on-dark" />
                {noticeTitle}
              </>
            ) : undefined
          }
        >
          {noticeBody && <p className="whitespace-pre-line">{noticeBody}</p>}
        </Card>
      )}

      <AuthPromptModal
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        title={t("newOrder.authPromptTitle")}
        body={t("newOrder.authPromptBody")}
      />
    </div>
  );
}
