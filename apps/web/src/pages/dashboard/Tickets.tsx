import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createTicket, getMyTickets } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { GuestLockedCard } from "../../components/auth/GuestGate.js";
import { EmptyState, StatusBadge, Tabs } from "../../components/ds/index.js";
import { TicketForm, type TicketFormValue } from "../../components/tickets/TicketForm.js";

export default function Tickets() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => getMyTickets({ page: 1, pageSize: 20 }),
    enabled: !!user,
  });

  const [tab, setTab] = useState<"new" | "history">("new");
  const [formKey, setFormKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(value: TicketFormValue) {
    setSubmitting(true);
    setError(null);
    try {
      await createTicket(value);
      toast.push(t("tickets.submittedToast"), "success");
      setFormKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setTab("history");
    } catch (err) {
      setError(apiErrorMessage(err, t("tickets.failedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return <GuestLockedCard title={t("guestGate.pageTitle")} body={t("guestGate.ticketsBody")} />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Tabs
          items={[
            { id: "new", label: t("tickets.tabNew") },
            { id: "history", label: t("tickets.tabHistory"), count: data?.total },
          ]}
          activeId={tab}
          onChange={(id) => setTab(id as "new" | "history")}
        />

        {tab === "new" ? (
          <div className="card space-y-4">
            <h2 className="text-lg font-bold">{t("tickets.newTicket")}</h2>
            <TicketForm
              key={formKey}
              onSubmit={onSubmit}
              submitting={submitting}
              error={error}
              submitLabel={t("tickets.submit")}
            />
          </div>
        ) : (
          <div className="card">
            <h2 className="mb-3 text-sm font-semibold">{t("tickets.ticketHistory")}</h2>
            <ul className="divide-y divide-outline-variant">
              {data?.items.map((tk: { id: string; subject: string; status: string; updatedAt: string }) => (
                <li key={tk.id}>
                  <Link
                    to={`/dashboard/tickets/${tk.id}`}
                    className="flex min-h-[44px] flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 text-sm hover:text-primary"
                  >
                    <span className="min-w-0 flex-1 basis-full truncate sm:basis-auto">{tk.subject}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-on-surface-variant">{new Date(tk.updatedAt).toLocaleDateString()}</span>
                      <StatusBadge status={tk.status} kind="ticket" />
                    </span>
                  </Link>
                </li>
              ))}
              {data?.items.length === 0 && <EmptyState icon="support" title={t("tickets.noTicketsYet")} />}
            </ul>
          </div>
        )}
      </div>

      <aside className="card h-fit space-y-3 text-sm">
        <h2 className="text-sm font-semibold">{t("tickets.readBeforeTitle")}</h2>
        <p className="text-on-surface-variant">{t("tickets.guidelineAi")}</p>
        <p className="text-on-surface-variant">{t("tickets.guidelineHuman")}</p>
        <p className="text-on-surface-variant">{t("tickets.guidelineOne")}</p>
      </aside>
    </div>
  );
}
