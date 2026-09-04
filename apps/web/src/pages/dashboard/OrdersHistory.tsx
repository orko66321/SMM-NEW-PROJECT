import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { OrderStatusValues } from "@smm/shared";
import { apiErrorMessage } from "../../api/client.js";
import { getMyOrders, getOrderDeliveredCode, requestOrderRefill } from "../../api/resources.js";
import { useToast } from "../../components/ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { pickLang } from "../../i18n/pickLang.js";
import { GuestLockedCard } from "../../components/auth/GuestGate.js";
import { Badge, EmptyState, Icon, Pagination, StatusBadge, Tabs } from "../../components/ds/index.js";

const statusTabs = ["ALL", ...OrderStatusValues] as const;

type OrderRow = {
  id: string;
  createdAt: string;
  service: { name: string; nameBn: string | null; refillEnabled: boolean } | null;
  // Present instead of `service` for a Store (Brand → Product → Package) purchase.
  package: { name: string; product: { name: string; brand: { name: string } } } | null;
  stockCode: { id: string } | null;
  link: string;
  charge: string;
  quantity: number;
  remains: number | null;
  status: string;
  // Admin-authored note about this specific order (wrong UID, cancelled &
  // refunded, delayed, contact support…). Empty ⇒ nothing rendered.
  adminComment: string | null;
  adminCommentLink: string | null;
  adminCommentUpdatedAt: string | null;
};

function isRefillEligible(o: OrderRow) {
  return !!o.service?.refillEnabled && (o.status === "COMPLETED" || o.status === "PARTIAL");
}

function orderTitle(o: OrderRow, lang: "en" | "bn") {
  if (o.service) return pickLang(lang, o.service.nameBn, o.service.name);
  if (o.package) return `${o.package.product.brand.name} — ${o.package.product.name} — ${o.package.name}`;
  return "—";
}

function RevealCodeButton({ orderId }: { orderId: string }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [code, setCode] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => getOrderDeliveredCode(orderId),
    onSuccess: (result) => setCode(result.code),
    onError: (err) => toast.push(apiErrorMessage(err, t("ordersHistory.revealCodeFailedFallback")), "error"),
  });

  if (code) {
    return <code className="block max-w-[220px] truncate rounded bg-surface-container-highest px-2 py-1 text-xs">{code}</code>;
  }

  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="btn-ghost !min-h-[36px] shrink-0 !px-3 !py-1.5 text-xs"
    >
      {mutation.isPending ? t("ordersHistory.requesting") : t("ordersHistory.revealCode")}
    </button>
  );
}

function RefillButton({ orderId }: { orderId: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => requestOrderRefill(orderId),
    onSuccess: () => {
      setDone(true);
      toast.push(t("ordersHistory.refillRequestedToast"), "success");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => {
      toast.push(apiErrorMessage(err, t("ordersHistory.refillFailedFallback")), "error");
    },
  });

  if (done) {
    return <Badge tone="info" className="shrink-0">{t("ordersHistory.refillRequested")}</Badge>;
  }

  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="btn-ghost !min-h-[36px] shrink-0 !px-3 !py-1.5 text-xs"
    >
      {mutation.isPending ? t("ordersHistory.requesting") : t("ordersHistory.refillButton")}
    </button>
  );
}

function CopyIdButton({ id }: { id: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(id);
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
      aria-label={t("ordersHistory.copyOrderId")}
      title={copied ? t("ordersHistory.copied") : t("ordersHistory.copyOrderId")}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
    >
      <Icon name={copied ? "check" : "copy"} size={18} className={copied ? "text-success" : undefined} />
    </button>
  );
}

function OrderCard({ o }: { o: OrderRow }) {
  const { t, lang } = useLanguage();
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-on-surface">{orderTitle(o, lang)}</p>
          <p className="mt-0.5 text-xs text-on-surface-variant">{new Date(o.createdAt).toLocaleDateString()}</p>
        </div>
        <StatusBadge status={o.status} className="shrink-0" />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-outline-variant pt-3">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate font-mono text-xs text-on-surface-variant">#{o.id.slice(0, 8)}</span>
          <CopyIdButton id={o.id} />
        </span>
        {isRefillEligible(o) && <RefillButton orderId={o.id} />}
        {o.stockCode && <RevealCodeButton orderId={o.id} />}
      </div>

      <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-on-surface-variant">{t("ordersHistory.tableLink")}</dt>
          <dd className="truncate text-xs text-on-surface-variant">{o.link}</dd>
        </div>
        <div>
          <dt className="text-xs text-on-surface-variant">{t("ordersHistory.tableCharge")}</dt>
          <dd className="font-mono">${o.charge}</dd>
        </div>
        <div>
          <dt className="text-xs text-on-surface-variant">{t("ordersHistory.tableQty")}</dt>
          <dd className="font-mono">{o.quantity}</dd>
        </div>
        <div>
          <dt className="text-xs text-on-surface-variant">{t("ordersHistory.tableRemains")}</dt>
          <dd className="font-mono">{o.remains ?? "—"}</dd>
        </div>
      </dl>

      {o.adminComment && (
        <div className="mt-3 rounded-control border border-info/30 bg-info/10 px-3 py-2">
          <p className="text-xs font-semibold text-info">{t("ordersHistory.adminNoteLabel")}</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-on-surface">{o.adminComment}</p>
          {o.adminCommentLink && (
            <a
              href={o.adminCommentLink}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {t("ordersHistory.adminNoteLink")} <Icon name="external" size={12} />
            </a>
          )}
          {o.adminCommentUpdatedAt && (
            <p className="mt-1 text-[11px] text-on-surface-variant">
              {t("ordersHistory.adminNoteUpdated", { date: new Date(o.adminCommentUpdatedAt).toLocaleString() })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersHistory() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [status, setStatus] = useState<(typeof statusTabs)[number]>("ALL");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["orders", status, page],
    queryFn: () => getMyOrders({ page, pageSize: 20, status: status === "ALL" ? undefined : status }),
    enabled: !!user,
  });

  function tabLabel(tab: (typeof statusTabs)[number]) {
    return tab === "ALL" ? t("ordersHistory.allTab") : t(`common.orderStatus.${tab}`);
  }

  if (!user) {
    return <GuestLockedCard title={t("guestGate.pageTitle")} body={t("guestGate.ordersBody")} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("ordersHistory.title")}</h1>

      <Tabs
        activeId={status}
        onChange={(id) => {
          setStatus(id as (typeof statusTabs)[number]);
          setPage(1);
        }}
        items={statusTabs.map((tab) => ({ id: tab, label: tabLabel(tab) }))}
      />

      {/* Mobile: stacked cards */}
      <div className="space-y-3 md:hidden">
        {isLoading && <p className="card text-center text-sm text-on-surface-variant">{t("common.loading")}</p>}
        {!isLoading && data?.items.length === 0 && (
          <div className="card">
            <EmptyState icon="orders" title={t("ordersHistory.noOrdersFound")} />
          </div>
        )}
        {data?.items.map((o: OrderRow) => (
          <OrderCard key={o.id} o={o} />
        ))}
      </div>

      {/* Desktop / tablet: table */}
      <div className="card hidden overflow-x-auto p-0 md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">{t("ordersHistory.tableId")}</th>
              <th className="px-4 py-3">{t("ordersHistory.tableDate")}</th>
              <th className="px-4 py-3">{t("ordersHistory.tableService")}</th>
              <th className="px-4 py-3">{t("ordersHistory.tableLink")}</th>
              <th className="px-4 py-3">{t("ordersHistory.tableCharge")}</th>
              <th className="px-4 py-3">{t("ordersHistory.tableQty")}</th>
              <th className="px-4 py-3">{t("ordersHistory.tableRemains")}</th>
              <th className="px-4 py-3">{t("ordersHistory.tableStatus")}</th>
              <th className="px-4 py-3">{t("ordersHistory.tableAction")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-on-surface-variant">{t("common.loading")}</td></tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-on-surface-variant">{t("ordersHistory.noOrdersFound")}</td></tr>
            )}
            {data?.items.map((o: OrderRow) => (
              <Fragment key={o.id}>
              <tr className={o.adminComment ? "border-b-0" : ""}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 font-mono text-xs text-on-surface-variant">
                    <span>{o.id.slice(0, 8)}</span>
                    <CopyIdButton id={o.id} />
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">{orderTitle(o, lang)}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-xs text-on-surface-variant">{o.link}</td>
                <td className="px-4 py-3 font-mono">${o.charge}</td>
                <td className="px-4 py-3 font-mono">{o.quantity}</td>
                <td className="px-4 py-3 font-mono">{o.remains ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3">
                  {isRefillEligible(o) && <RefillButton orderId={o.id} />}
                  {o.stockCode && <RevealCodeButton orderId={o.id} />}
                </td>
              </tr>
              {o.adminComment && (
                <tr>
                  <td colSpan={9} className="px-4 pb-3">
                    <div className="rounded-control border border-info/30 bg-info/10 px-3 py-2">
                      <p className="text-xs font-semibold text-info">{t("ordersHistory.adminNoteLabel")}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-on-surface">{o.adminComment}</p>
                      {o.adminCommentLink && (
                        <a href={o.adminCommentLink} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                          {t("ordersHistory.adminNoteLink")} <Icon name="external" size={12} />
                        </a>
                      )}
                      {o.adminCommentUpdatedAt && (
                        <p className="mt-1 text-[11px] text-on-surface-variant">
                          {t("ordersHistory.adminNoteUpdated", { date: new Date(o.adminCommentUpdatedAt).toLocaleString() })}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > data.pageSize && (
        <Pagination
          page={page}
          totalPages={Math.ceil(data.total / data.pageSize)}
          onChange={setPage}
          labels={{
            prev: t("ordersHistory.prev"),
            next: t("ordersHistory.next"),
            status: t("ordersHistory.page", { page }),
          }}
        />
      )}
    </div>
  );
}
