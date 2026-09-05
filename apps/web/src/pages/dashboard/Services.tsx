import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getPublicCategories, getPublicServices, getPublicSettings } from "../../api/resources.js";
import ServiceDetailsModal from "../../components/ui/ServiceDetailsModal.js";
import RecentlyCompleted from "../../components/services/RecentlyCompleted.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { pickLang } from "../../i18n/pickLang.js";
import { Badge, EmptyState, Icon, ServiceTag, Skeleton } from "../../components/ds/index.js";

interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  nameBn: string | null;
  descriptionBn: string | null;
  minQuantity: number;
  maxQuantity: number;
  sellPricePer1000: string;
  refillEnabled: boolean;
  cancelEnabled: boolean;
  providerServiceId: string | null;
  avgCompletionSeconds: number | null;
  lastCompletedAt: string | null;
}

function ServiceCard({ s, onDetails, windowHours }: { s: ServiceRow; onDetails: () => void; windowHours: number | null }) {
  const { t, lang } = useLanguage();
  return (
    <div className="card-interactive rounded-card border border-outline-variant bg-surface-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug text-on-surface">{pickLang(lang, s.nameBn, s.name)}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {s.providerServiceId && (
              <Badge mono className="!text-[11px]">ID {s.providerServiceId}</Badge>
            )}
            {s.refillEnabled && <ServiceTag label="Refill" />}
            {!s.cancelEnabled && <ServiceTag label="No Cancel" />}
          </div>
        </div>
        <p className="shrink-0 whitespace-nowrap text-right font-mono text-base font-semibold text-success">
          ${s.sellPricePer1000}
          <span className="ml-0.5 block text-[10px] font-normal text-on-surface-variant">/1000</span>
        </p>
      </div>

      {pickLang(lang, s.descriptionBn, s.description) && (
        <p className="mt-2 line-clamp-2 whitespace-pre-line text-xs text-on-surface-variant">
          {pickLang(lang, s.descriptionBn, s.description)}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-outline-variant pt-3 text-xs text-on-surface-variant">
        <span>{t("servicesPage.minMaxLabel", { min: s.minQuantity, max: s.maxQuantity })}</span>
        <RecentlyCompleted
          serviceId={s.id}
          avgCompletionSeconds={s.avgCompletionSeconds}
          lastCompletedAt={s.lastCompletedAt}
          windowHours={windowHours}
          variant="cell"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onDetails} className="btn-ghost !min-h-[38px] justify-center !px-3 !py-2 text-xs">
          {t("common.details")}
        </button>
        <Link to={`/dashboard/new-order?serviceId=${s.id}`} className="btn-primary !min-h-[38px] justify-center !px-3 !py-2 text-xs">
          {t("common.orderNow")}
        </Link>
      </div>
    </div>
  );
}

export default function Services() {
  const { t, lang } = useLanguage();
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [detailsService, setDetailsService] = useState<ServiceRow | null>(null);
  // Public (unauthenticated) catalog — this whole page is guest-browsable
  // per the site's "browse = public" model (see GuestGate.tsx / App.tsx).
  const { data: categories } = useQuery({ queryKey: ["public-categories"], queryFn: getPublicCategories });
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 60_000 });
  const windowHours: number | null = settings?.recentlyCompletedWindowHours ?? null;
  const { data, isLoading } = useQuery({
    queryKey: ["public-services-catalog", categoryId, search],
    queryFn: () => getPublicServices({ page: 1, pageSize: 100, categoryId: categoryId || undefined, search: search || undefined }),
  });

  const items: ServiceRow[] = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">{t("servicesPage.title")}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t("servicesPage.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-xs">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            className="input-field pl-9"
            placeholder={t("servicesPage.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field sm:max-w-xs" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">{t("newOrder.allCategories")}</option>
          {categories?.map((c: { id: string; name: string; platform: string }) => (
            <option key={c.id} value={c.id}>{c.platform} — {c.name}</option>
          ))}
        </select>
      </div>

      {!isLoading && (
        <p className="text-xs text-on-surface-variant">
          {t(items.length === 1 ? "servicesPage.countFound" : "servicesPage.countFoundPlural", { count: items.length })}
        </p>
      )}

      {/* Mobile: stacked cards */}
      <div className="space-y-3 md:hidden">
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        {!isLoading && items.length === 0 && (
          <div className="card">
            <EmptyState icon="grid" title={t("servicesPage.noMatch")} />
          </div>
        )}
        {items.map((s) => (
          <ServiceCard key={s.id} s={s} onDetails={() => setDetailsService(s)} windowHours={windowHours} />
        ))}
      </div>

      {/* Desktop / tablet: table */}
      <div className="card hidden overflow-x-auto p-0 md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">{t("servicesPage.tableId")}</th>
              <th className="px-4 py-3">{t("servicesPage.tableService")}</th>
              <th className="px-4 py-3">{t("servicesPage.tableMinMax")}</th>
              <th className="px-4 py-3">{t("servicesPage.tablePrice")}</th>
              <th className="px-4 py-3">{t("servicesPage.tableAvgTime")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-on-surface-variant">{t("common.loading")}</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-on-surface-variant">{t("servicesPage.noMatch")}</td></tr>
            )}
            {items.map((s) => (
              <tr key={s.id} className="row-hover">
                <td className="px-4 py-3">
                  {s.providerServiceId ? (
                    <Badge mono>{s.providerServiceId}</Badge>
                  ) : (
                    <span className="text-xs text-on-surface-variant">—</span>
                  )}
                </td>
                <td className="max-w-[320px] px-4 py-3">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <span>{pickLang(lang, s.nameBn, s.name)}</span>
                    {s.refillEnabled && <ServiceTag label="Refill" />}
                    {!s.cancelEnabled && <ServiceTag label="No Cancel" />}
                  </p>
                  {pickLang(lang, s.descriptionBn, s.description) && (
                    <p className="mt-0.5 truncate text-xs text-on-surface-variant" title={pickLang(lang, s.descriptionBn, s.description)}>
                      {pickLang(lang, s.descriptionBn, s.description)}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{s.minQuantity} / {s.maxQuantity}</td>
                <td className="px-4 py-3 font-mono text-success">${s.sellPricePer1000}</td>
                <td className="px-4 py-3">
                  <RecentlyCompleted
                    serviceId={s.id}
                    avgCompletionSeconds={s.avgCompletionSeconds}
                    lastCompletedAt={s.lastCompletedAt}
                    windowHours={windowHours}
                    variant="cell"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setDetailsService(s)} className="btn-ghost !min-h-0 !px-3 !py-1.5 text-xs">
                      {t("common.details")}
                    </button>
                    <Link to={`/dashboard/new-order?serviceId=${s.id}`} className="btn-primary !min-h-0 !px-3 !py-1.5 text-xs">
                      {t("common.orderNow")}
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailsService && (
        <ServiceDetailsModal
          // Built explicitly rather than spreading detailsService directly —
          // the real API response also carries a `category: {name, platform}`
          // object (see catalog.service.ts's `include`) that this page's
          // ServiceRow type doesn't declare but is present at runtime; passed
          // through as-is it collides with ServiceDetailsData's unrelated
          // `category?: string` field and React crashes trying to render an
          // object as a child.
          service={{
            name: pickLang(lang, detailsService.nameBn, detailsService.name),
            description: pickLang(lang, detailsService.descriptionBn, detailsService.description) || null,
            sellPricePer1000: detailsService.sellPricePer1000,
            minQuantity: detailsService.minQuantity,
            maxQuantity: detailsService.maxQuantity,
            refillEnabled: detailsService.refillEnabled,
            cancelEnabled: detailsService.cancelEnabled,
            providerServiceId: detailsService.providerServiceId,
          }}
          onClose={() => setDetailsService(null)}
          footer={
            <Link
              to={`/dashboard/new-order?serviceId=${detailsService.id}`}
              className="btn-primary w-full justify-center"
              onClick={() => setDetailsService(null)}
            >
              {t("common.orderNow")}
            </Link>
          }
        />
      )}
    </div>
  );
}
