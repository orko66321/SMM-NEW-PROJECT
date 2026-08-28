import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTicket, replyToTicket } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { GuestLockedCard } from "../../components/auth/GuestGate.js";

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: ticket } = useQuery({ queryKey: ["ticket", id], queryFn: () => getTicket(id!), enabled: !!id && !!user });

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || !message.trim()) return;
    setSubmitting(true);
    try {
      await replyToTicket(id, message);
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    } catch (err) {
      toast.push(apiErrorMessage(err, t("ticketDetail.failedFallback")), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return <GuestLockedCard title={t("guestGate.pageTitle")} body={t("guestGate.ticketsBody")} />;
  }

  if (!ticket) return <p className="text-on-surface-variant">{t("common.loading")}</p>;

  return (
    <div className="card mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{ticket.subject}</h1>
        <span className="badge bg-primary/15 text-primary">{t(`common.ticketStatus.${ticket.status}`)}</span>
      </div>

      <div className="space-y-3">
        {ticket.messages.map((m: { id: string; senderRole: string; body: string; createdAt: string }) => (
          <div key={m.id} className={`max-w-[85%] break-words rounded-md p-3 text-sm sm:max-w-[80%] ${m.senderRole === "ADMIN" ? "bg-primary/10" : "ml-auto bg-surface-container-high"}`}>
            <p className="mb-1 text-xs font-semibold text-on-surface-variant">{m.senderRole === "ADMIN" ? t("ticketDetail.support") : t("ticketDetail.you")}</p>
            <p className="whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
      </div>

      {ticket.status !== "CLOSED" && (
        <form onSubmit={onSubmit} className="flex flex-wrap gap-2 sm:flex-nowrap">
          <input
            className="input-field min-w-0 flex-1 basis-full sm:basis-auto"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("ticketDetail.replyPlaceholder")}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={submitting}>{t("ticketDetail.send")}</button>
        </form>
      )}
    </div>
  );
}
