import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminTicket,
  replyToAdminTicket,
  runAdminTicketAction,
  updateAdminTicketStatus,
} from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { Breadcrumbs, StatusBadge } from "../../components/ds/index.js";
import type { TicketAgentAction } from "@smm/shared";

interface TicketMessage {
  id: string;
  senderRole: "USER" | "ADMIN" | "SYSTEM";
  body: string;
}
interface LinkedOrder {
  id: string;
  status: string;
  quantity: number;
  link: string;
  mode: string;
  providerOrderId: string | null;
  charge: string;
  service: { name: string; refillEnabled: boolean; cancelEnabled: boolean } | null;
}
interface OrderAction {
  id: string;
  orderId: string;
  actionKey: string;
  result: string;
  detail: string | null;
  createdAt: string;
}

export default function AdminTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: ticket } = useQuery({ queryKey: ["admin-ticket", id], queryFn: () => getAdminTicket(id!), enabled: !!id });

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

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

  async function runAction(action: TicketAgentAction, orderId?: string) {
    if (!id) return;
    setBusyAction(`${action}:${orderId ?? ""}`);
    try {
      await runAdminTicketAction(id, { action, orderId });
      toast.push(`${action} done`, "success");
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err, `${action} failed`), "error");
    } finally {
      setBusyAction(null);
    }
  }

  async function setStatus(status: string) {
    if (!id) return;
    await updateAdminTicketStatus(id, status);
    refresh();
  }

  if (!ticket) return <p className="text-on-surface-variant">Loading…</p>;

  const linkedOrders: LinkedOrder[] = ticket.linkedOrders ?? [];
  const orderActions: OrderAction[] = ticket.orderActions ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Tickets", to: "/admin/tickets" }, { label: ticket.subject }]} />

      <div className="card space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold break-words">{ticket.subject}</h1>
            {ticket.category && (
              <p className="text-xs text-on-surface-variant">
                {ticket.category.name}{ticket.subcategory ? ` · ${ticket.subcategory.name}` : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} kind="ticket" />
            {ticket.status !== "CLOSED" ? (
              <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setStatus("CLOSED")}>Close</button>
            ) : (
              <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setStatus("IN_PROGRESS")}>Reopen</button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {ticket.messages.map((m: TicketMessage) => {
            const system = m.senderRole === "SYSTEM";
            const admin = m.senderRole === "ADMIN";
            return (
              <div
                key={m.id}
                className={`max-w-[80%] whitespace-pre-wrap break-words rounded-control p-3 text-sm ${
                  system
                    ? "border border-outline-variant bg-surface-container"
                    : admin
                      ? "ml-auto border border-primary/25 bg-primary/10"
                      : "border border-outline-variant bg-surface-container-high"
                }`}
              >
                <p className="mb-1 text-xs font-semibold text-on-surface-variant">
                  {system ? "Automated" : admin ? "Support (you)" : "Customer"}
                </p>
                <p>{m.body}</p>
              </div>
            );
          })}
        </div>

        {ticket.status !== "CLOSED" && (
          <form onSubmit={onSubmit} className="flex gap-2">
            <input className="input-field min-w-0 flex-1" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a reply…" />
            <button type="submit" className="btn-primary shrink-0" disabled={submitting}>Send</button>
          </form>
        )}
      </div>

      {linkedOrders.length > 0 && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold">Linked orders — agent actions</h2>
          <p className="text-xs text-on-surface-variant">
            Refill / Cancel / Restart run the same logic the automation engine uses. Cancel refunds the wallet.
          </p>
          {linkedOrders.map((o) => (
            <div key={o.id} className="rounded-control border border-outline-variant p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-on-surface-variant">#{o.id}</p>
                  <p className="truncate">{o.service?.name ?? "—"} · qty {o.quantity} · {o.mode}</p>
                  <p className="truncate text-xs text-on-surface-variant">{o.link}</p>
                </div>
                <StatusBadge status={o.status} kind="order" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["refill", "cancel", "restart"] as const).map((a) => (
                  <button
                    key={a}
                    className="btn-ghost !px-3 !py-1.5 text-xs capitalize"
                    disabled={busyAction === `${a}:${o.id}`}
                    onClick={() => runAction(a, o.id)}
                  >
                    {busyAction === `${a}:${o.id}` ? "…" : a}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {orderActions.length > 0 && (
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold">Action log</h2>
          <ul className="space-y-1 text-xs text-on-surface-variant">
            {orderActions.map((a) => (
              <li key={a.id}>
                <span className="font-mono">{new Date(a.createdAt).toLocaleString()}</span>{" "}
                — {a.actionKey} on #{a.orderId}: <span className="font-semibold">{a.result}</span>
                {a.detail ? ` — ${a.detail}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
