import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { OrderStatusValues } from "@smm/shared";
import { apiErrorMessage } from "../../api/client.js";
import { getMyOrders, requestOrderRefill } from "../../api/resources.js";
import { useToast } from "../../components/ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { pickLang } from "../../i18n/pickLang.js";
import { GuestLockedCard } from "../../components/auth/GuestGate.js";

const statusTabs = ["ALL", ...OrderStatusValues] as const;

type OrderRow = {
  id: string;
  createdAt: string;
  service: { name: string; nameBn: string | null; refillEnabled: boolean };
  link: string;
  charge: string;
  quantity: number;
  remains: number | null;
  status: string;
};

function isRefillEligible(o: OrderRow) {
  return o.service.refillEnabled && (o.status === "COMPLETED" || o.status === "PARTIAL");
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
    return <span className="badge shrink-0 bg-info/15 text-info">{t("ordersHistory.refillRequested")}</span>;
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
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
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

function OrderCard({ o }: { o: OrderRow }) {
  const { t, lang } = useLanguage();
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-on-surface">{pickLang(lang, o.service.nameBn, o.service.name)}</p>
          <p className="mt-0.5 text-xs text-on-surface-variant">{new Date(o.createdAt).toLocaleDateString()}</p>
        </div>
        <span className="badge shrink-0 bg-primary/15 text-primary">{t(`common.orderStatus.${o.status}`)}</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-outline-variant pt-3">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate font-mono text-xs text-on-surface-variant">#{o.id.slice(0, 8)}</span>
          <CopyIdButton id={o.id} />
        </span>
        {isRefillEligible(o) && <RefillButton orderId={o.id} />}
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

      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 snap-x sm:flex-wrap sm:overflow-visible">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatus(tab);
              setPage(1);
            }}
            className={`shrink-0 snap-start rounded-full px-3 py-1.5 text-xs font-semibold ${
              status === tab ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      {/* Mobile: stacked cards */}
      <div className="space-y-3 md:hidden">
        {isLoading && <p className="card text-center text-sm text-on-surface-variant">{t("common.loading")}</p>}
        {!isLoading && data?.items.length === 0 && (
          <p className="card text-center text-sm text-on-surface-variant">{t("ordersHistory.noOrdersFound")}</p>
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
              <tr key={o.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 font-mono text-xs text-on-surface-variant">
                    <span>{o.id.slice(0, 8)}</span>
                    <CopyIdButton id={o.id} />
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">{pickLang(lang, o.service.nameBn, o.service.name)}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-xs text-on-surface-variant">{o.link}</td>
                <td className="px-4 py-3 font-mono">${o.charge}</td>
                <td className="px-4 py-3 font-mono">{o.quantity}</td>
                <td className="px-4 py-3 font-mono">{o.remains ?? "—"}</td>
                <td className="px-4 py-3"><span className="badge bg-primary/15 text-primary">{t(`common.orderStatus.${o.status}`)}</span></td>
                <td className="px-4 py-3">{isRefillEligible(o) && <RefillButton orderId={o.id} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex justify-center gap-2">
          <button className="btn-ghost !px-3 !py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("ordersHistory.prev")}</button>
          <span className="self-center text-xs text-on-surface-variant">{t("ordersHistory.page", { page })}</span>
          <button
            className="btn-ghost !px-3 !py-1.5 text-xs"
            disabled={page * data.pageSize >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("ordersHistory.next")}
          </button>
        </div>
      )}
    </div>
  );
}
