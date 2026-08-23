import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTicket, replyToTicket } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: ticket } = useQuery({ queryKey: ["ticket", id], queryFn: () => getTicket(id!), enabled: !!id });

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
      toast.push(apiErrorMessage(err, "Failed to send reply"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ticket) return <p className="text-on-surface-variant">Loading…</p>;

  return (
    <div className="card mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{ticket.subject}</h1>
        <span className="badge bg-primary/15 text-primary">{ticket.status}</span>
      </div>

      <div className="space-y-3">
        {ticket.messages.map((m: { id: string; senderRole: string; body: string; createdAt: string }) => (
          <div key={m.id} className={`max-w-[80%] rounded-md p-3 text-sm ${m.senderRole === "ADMIN" ? "bg-primary/10" : "ml-auto bg-surface-container-high"}`}>
            <p className="mb-1 text-xs font-semibold text-on-surface-variant">{m.senderRole === "ADMIN" ? "Support" : "You"}</p>
            <p>{m.body}</p>
          </div>
        ))}
      </div>

      {ticket.status !== "CLOSED" && (
        <form onSubmit={onSubmit} className="flex gap-2">
          <input className="input-field" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a reply…" />
          <button type="submit" className="btn-primary" disabled={submitting}>Send</button>
        </form>
      )}
    </div>
  );
}
