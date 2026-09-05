import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getServiceCompletedOrders } from "../../api/resources.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { formatDuration, isRecentlyCompleted } from "../../lib/duration.js";
import { Icon, Modal, Pagination, StatusBadge } from "../ds/index.js";

const PAGE_SIZE = 10;

interface Props {
  serviceId: string;
  avgCompletionSeconds: number | null;
  lastCompletedAt: string | null;
  windowHours: number | null;
  /** "cell" = compact, for the Services table row. "field" = a bordered read-only box, for New Order. */
  variant: "cell" | "field";
}

/**
 * Renders a service's precomputed "Average Time" plus, when its newest
 * completion is fresh enough, a "Recently Completed" badge that opens a
 * paginated history modal. The modal fetches on demand and degrades to
 * "Failed to load" on error — it never blocks the page it sits on.
 */
export default function RecentlyCompleted({
  serviceId,
  avgCompletionSeconds,
  lastCompletedAt,
  windowHours,
  variant,
}: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  const avgText = formatDuration(t, avgCompletionSeconds) ?? t("completionTime.none");
  const showBadge = isRecentlyCompleted(lastCompletedAt, windowHours);

  const historyQuery = useQuery({
    queryKey: ["service-completed-orders", serviceId, page],
    queryFn: () => getServiceCompletedOrders(serviceId, { page, pageSize: PAGE_SIZE }),
    enabled: open,
    placeholderData: (prev) => prev,
    retry: false,
  });

  const info = (
    <button
      type="button"
      title={t("completionTime.tooltip")}
      aria-label={t("completionTime.tooltip")}
      className="text-on-surface-variant transition hover:text-on-surface"
    >
      <Icon name="info" size={14} />
    </button>
  );

  const badge = showBadge && (
    <button
      type="button"
      onClick={() => {
        setPage(1);
        setOpen(true);
      }}
      className="badge badge-success cursor-pointer transition hover:brightness-110"
    >
      {t("completionTime.recentlyCompleted")}
    </button>
  );

  const totalPages = historyQuery.data
    ? Math.max(1, Math.ceil(historyQuery.data.total / historyQuery.data.pageSize))
    : 1;

  return (
    <>
      {variant === "field" ? (
        <div className="rounded-control border border-outline-variant bg-surface-container-high px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="label mb-0 flex items-center gap-1.5">
              {t("completionTime.label")}
              {info}
            </span>
            <span className="font-mono text-sm font-semibold text-on-surface">{avgText}</span>
          </div>
          {badge && <div className="mt-2">{badge}</div>}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-on-surface-variant">
            {avgText}
            {info}
          </span>
          {badge}
        </div>
      )}

      {open && (
        <Modal title={t("completionTime.modalTitle")} onClose={() => setOpen(false)} size="md">
          {historyQuery.isError ? (
            <p className="py-6 text-center text-sm text-error">{t("completionTime.loadFailed")}</p>
          ) : historyQuery.isLoading ? (
            <p className="py-6 text-center text-sm text-on-surface-variant">{t("common.loading")}</p>
          ) : !historyQuery.data || historyQuery.data.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-on-surface-variant">{t("completionTime.empty")}</p>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
                    <tr>
                      <th className="px-2 py-2">{t("completionTime.colDate")}</th>
                      <th className="px-2 py-2">{t("completionTime.colCompleted")}</th>
                      <th className="px-2 py-2">{t("completionTime.colQuantity")}</th>
                      <th className="px-2 py-2">{t("completionTime.colStatus")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {historyQuery.data.items.map((o) => (
                      <tr key={o.id}>
                        <td className="px-2 py-2 text-xs">{new Date(o.completedAt).toLocaleDateString()}</td>
                        <td className="px-2 py-2 text-xs">
                          {formatDuration(t, o.completionSeconds) ?? "—"}
                        </td>
                        <td className="px-2 py-2 font-mono text-xs">{o.quantity.toLocaleString()}</td>
                        <td className="px-2 py-2">
                          <StatusBadge status={o.status} kind="order" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
                labels={{
                  prev: t("ordersHistory.prev"),
                  next: t("ordersHistory.next"),
                  status: t("ordersHistory.page", { page }),
                }}
              />
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
