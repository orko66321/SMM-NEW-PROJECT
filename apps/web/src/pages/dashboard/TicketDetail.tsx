import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTicket, replyToTicket } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { GuestLockedCard } from "../../components/auth/GuestGate.js";
import { StatusBadge } from "../../components/ds/index.js";
import { TicketForm, type TicketFormValue } from "../../components/tickets/TicketForm.js";

interface TicketMessage {
  id: string;
  senderRole: "USER" | "ADMIN" | "SYSTEM";
  body: string;
  createdAt: string;
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: ticket } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => getTicket(id!),
    enabled: !!id && !!user,
  });

  const [formKey, setFormKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(value: TicketFormValue) {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      await replyToTicket(id, value);
      setFormKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    } catch (err) {
      setError(apiErrorMessage(err, t("ticketDetail.failedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return <GuestLockedCard title={t("guestGate.pageTitle")} body={t("guestGate.ticketsBody")} />;
  }
  if (!ticket) return <p className="text-on-surface-variant">{t("common.loading")}</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">{ticket.subject}</h1>
          <StatusBadge status={ticket.status} kind="ticket" />
        </div>

        <div className="space-y-3">
          {ticket.messages.map((m: TicketMessage) => {
            const mine = m.senderRole === "USER";
            const system = m.senderRole === "SYSTEM";
            return (
              <div
                key={m.id}
                className={`max-w-[85%] break-words rounded-control p-3 text-sm sm:max-w-[80%] ${
                  system
                    ? "border border-outline-variant bg-surface-container"
                    : mine
                      ? "ml-auto border border-outline-variant bg-surface-container-high"
                      : "border border-primary/25 bg-primary/10"
                }`}
              >
                <p className="mb-1 text-xs font-semibold text-on-surface-variant">
                  {system ? t("ticketDetail.system") : mine ? t("ticketDetail.you") : t("ticketDetail.support")}
                </p>
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
            );
          })}
        </div>
      </div>

      {ticket.status === "CLOSED" ? (
        <p className="text-sm text-on-surface-variant">{t("ticketDetail.closedNote")}</p>
      ) : (
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold">{t("ticketDetail.replyHeading")}</h2>
          <TicketForm
            key={formKey}
            onSubmit={onSubmit}
            submitting={submitting}
            error={error}
            submitLabel={t("ticketDetail.send")}
          />
        </div>
      )}
    </div>
  );
}
