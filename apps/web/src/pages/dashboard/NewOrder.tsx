import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { getCategories, getPublicSiteNotice, getServices, placeOrder } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { useLanguage } from "../../context/LanguageContext.js";

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
  categoryId: string;
  sellPricePer1000: string;
  minQuantity: number;
  maxQuantity: number;
  refillEnabled: boolean;
  cancelEnabled: boolean;
}

export default function NewOrder() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, lang } = useLanguage();
  const { data: siteNotice } = useQuery({ queryKey: ["public-site-notice"], queryFn: getPublicSiteNotice, staleTime: 60_000 });

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const [categoryId, setCategoryId] = useState<string>("");
  const { data: servicesData } = useQuery({
    queryKey: ["services", categoryId],
    queryFn: () => getServices({ page: 1, pageSize: 100, categoryId: categoryId || undefined }),
  });

  const services: ServiceItem[] = useMemo(() => servicesData?.items ?? [], [servicesData]);
  const [serviceId, setServiceId] = useState<string>(searchParams.get("serviceId") ?? "");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
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
      setError(apiErrorMessage(err, t("newOrder.failedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <form onSubmit={onSubmit} className="card space-y-4 lg:col-span-2">
        <h1 className="text-lg font-bold sm:text-xl">{t("newOrder.title")}</h1>
        {error && <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error break-words">{error}</p>}

        <div>
          <label className="label" htmlFor="category">{t("newOrder.categoryLabel")}</label>
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
            {categories?.map((c: { id: string; name: string; platform: string }) => (
              <option key={c.id} value={c.id}>{c.platform} — {c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="service">{t("newOrder.serviceLabel")}</label>
          <select id="service" className="input-field" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
            <option value="" disabled>{t("newOrder.selectService")}</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — ${s.sellPricePer1000}/1000</option>
            ))}
          </select>
          {selectedService && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedService.refillEnabled && <span className="badge bg-success/15 text-success">{t("common.refill")}</span>}
              {!selectedService.cancelEnabled && <span className="badge bg-outline-variant/40 text-on-surface-variant">{t("serviceDetails.noCancel")}</span>}
            </div>
          )}
          {selectedService?.description && (
            <p className="mt-2 whitespace-pre-line rounded-md bg-surface-container-high px-3 py-2 text-xs text-on-surface-variant">
              {selectedService.description}
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

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-container-high px-4 py-3">
          <span className="text-sm text-on-surface-variant">{t("newOrder.estimatedCharge")}</span>
          <span className="font-mono text-lg font-semibold text-success">${estimatedCharge}</span>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting || !selectedService}>
          {submitting ? t("newOrder.submitting") : t("newOrder.submit")}
        </button>
      </form>

      {(noticeTitle || noticeBody) && (
        <aside className="card space-y-3 break-words text-sm text-on-surface-variant">
          {noticeTitle && <h2 className="font-semibold text-on-surface">{noticeTitle}</h2>}
          {noticeBody && <p className="whitespace-pre-line">{noticeBody}</p>}
        </aside>
      )}
    </div>
  );
}
