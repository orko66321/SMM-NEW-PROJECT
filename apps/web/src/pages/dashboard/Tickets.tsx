import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createTicket, getMyTickets } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

export default function Tickets() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["tickets"], queryFn: () => getMyTickets({ page: 1, pageSize: 20 }) });

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
      toast.push("Ticket submitted.", "success");
      setSubject("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to submit ticket"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="card lg:col-span-2">
        <h2 className="mb-3 text-sm font-semibold">Ticket history</h2>
        <ul className="divide-y divide-outline-variant">
          {data?.items.map((t: { id: string; subject: string; status: string; updatedAt: string }) => (
            <li key={t.id}>
              <Link to={`/dashboard/tickets/${t.id}`} className="flex items-center justify-between py-3 text-sm hover:text-primary">
                <span>{t.subject}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-on-surface-variant">{new Date(t.updatedAt).toLocaleDateString()}</span>
                  <span className="badge bg-primary/15 text-primary">{t.status}</span>
                </span>
              </Link>
            </li>
          ))}
          {data?.items.length === 0 && <p className="py-4 text-sm text-on-surface-variant">No tickets yet.</p>}
        </ul>
      </div>

      <form onSubmit={onSubmit} className="card h-fit space-y-4">
        <h2 className="text-lg font-bold">New Ticket</h2>
        {error && <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}
        <div>
          <label className="label" htmlFor="subject">Subject</label>
          <input id="subject" className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="message">Message</label>
          <textarea id="message" rows={5} className="input-field" value={message} onChange={(e) => setMessage(e.target.value)} required />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit ticket"}
        </button>
      </form>
    </div>
  );
}
