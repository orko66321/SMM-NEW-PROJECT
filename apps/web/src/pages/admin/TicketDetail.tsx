import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminTicket, replyToAdminTicket, updateAdminTicketStatus } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

export default function AdminTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: ticket } = useQuery({ queryKey: ["admin-ticket", id], queryFn: () => getAdminTicket(id!), enabled: !!id });

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-ticket", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || !message.trim()) return;
    setSubmitting(true);
    try {
      await replyToAdminTicket(id, message);
      setMessage("");
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to send reply"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onClose() {
    if (!id) return;
    await updateAdminTicketStatus(id, "CLOSED");
    refresh();
  }

  if (!ticket) return <p className="text-on-surface-variant">Loading…</p>;

  return (
    <div className="card mx-auto max-w-2xl space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold break-words">{ticket.subject}</h1>
        <div className="flex items-center gap-2">
          <span className="badge bg-primary/15 text-primary">{ticket.status}</span>
          {ticket.status !== "CLOSED" && <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={onClose}>Close</button>}
        </div>
      </div>

      <div className="space-y-3">
        {ticket.messages.map((m: { id: string; senderRole: string; body: string }) => (
          <div key={m.id} className={`max-w-[80%] rounded-md p-3 text-sm ${m.senderRole === "ADMIN" ? "ml-auto bg-primary/10" : "bg-surface-container-high"}`}>
            <p className="mb-1 text-xs font-semibold text-on-surface-variant">{m.senderRole === "ADMIN" ? "Support (you)" : "Customer"}</p>
            <p>{m.body}</p>
          </div>
        ))}
      </div>

      {ticket.status !== "CLOSED" && (
        <form onSubmit={onSubmit} className="flex gap-2">
          <input className="input-field min-w-0 flex-1" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a reply…" />
          <button type="submit" className="btn-primary shrink-0" disabled={submitting}>Send</button>
        </form>
      )}
    </div>
  );
}
