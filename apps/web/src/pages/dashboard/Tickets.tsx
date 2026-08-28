import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createTicket, getMyTickets } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { GuestLockedCard } from "../../components/auth/GuestGate.js";

export default function Tickets() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["tickets"], queryFn: () => getMyTickets({ page: 1, pageSize: 20 }), enabled: !!user });

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createTicket({ subject, message });
      toast.push(t("tickets.submittedToast"), "success");
      setSubject("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
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
      <div className="card lg:col-span-2">
        <h2 className="mb-3 text-sm font-semibold">{t("tickets.ticketHistory")}</h2>
        <ul className="divide-y divide-outline-variant">
          {data?.items.map((t2: { id: string; subject: string; status: string; updatedAt: string }) => (
            <li key={t2.id}>
              <Link
                to={`/dashboard/tickets/${t2.id}`}
                className="flex min-h-[44px] flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 text-sm hover:text-primary"
              >
                <span className="min-w-0 flex-1 basis-full truncate sm:basis-auto">{t2.subject}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-on-surface-variant">{new Date(t2.updatedAt).toLocaleDateString()}</span>
                  <span className="badge bg-primary/15 text-primary">{t(`common.ticketStatus.${t2.status}`)}</span>
                </span>
              </Link>
            </li>
          ))}
          {data?.items.length === 0 && <p className="py-4 text-sm text-on-surface-variant">{t("tickets.noTicketsYet")}</p>}
        </ul>
      </div>

      <form onSubmit={onSubmit} className="card h-fit space-y-4">
        <h2 className="text-lg font-bold">{t("tickets.newTicket")}</h2>
        {error && <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}
        <div>
          <label className="label" htmlFor="subject">{t("tickets.subjectLabel")}</label>
          <input id="subject" className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="message">{t("tickets.messageLabel")}</label>
          <textarea id="message" rows={5} className="input-field" value={message} onChange={(e) => setMessage(e.target.value)} required />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? t("tickets.submitting") : t("tickets.submit")}
        </button>
      </form>
    </div>
  );
}
