import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { OrderStatusValues } from "@smm/shared";
import {
  getAdminOrders,
  getAdminRefills,
  getAdminSettings,
  getCommentTemplates,
  resendAdminOrder,
  resolveAdminRefill,
  setAdminOrderComment,
  updateAdminOrderStatus,
  type CommentTemplateRow,
} from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { Badge, type BadgeTone, Breadcrumbs, EmptyState, Icon, Pagination, StatusBadge } from "../../components/ds/index.js";

type AdminOrderRow = {
  id: string;
  user: { username: string };
  service: { name: string } | null;
  package: { name: string; product: { name: string; brand: { name: string } } } | null;
  charge: string;
  providerCost: string;
  quantity: number;
  status: string;
  mode: string;
  link: string;
  providerOrderId: string | null;
  apiErrorResponse: string | null;
  adminComment: string | null;
  adminCommentLink: string | null;
  adminCommentUpdatedAt: string | null;
  createdAt: string;
};

/**
 * Per-order customer-facing note editor shown inside the expanded row. The
 * canned CommentTemplate list is offered as a picker (the "select a template
 * while cancelling / editing" flow from the spec); picking one fills the
 * fields, which the admin can still edit before saving.
 */
function OrderNoteEditor({ order, templates }: { order: AdminOrderRow; templates: CommentTemplateRow[] }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState(order.adminComment ?? "");
  const [link, setLink] = useState(order.adminCommentLink ?? "");

  const mutation = useMutation({
    mutationFn: (payload: { comment: string | null; commentLink: string | null }) =>
      setAdminOrderComment(order.id, payload),
    onSuccess: () => {
      toast.push("Customer note saved.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (err) => toast.push(apiErrorMessage(err, "Failed to save note"), "error"),
  });

  function applyTemplate(id: string) {
    const tmpl = templates.find((t) => t.id === id);
    if (!tmpl) return;
    setText(tmpl.text);
    setLink(tmpl.link ?? "");
  }

  return (
    <div className="space-y-2 border-t border-outline-variant pt-3">
      <p className="font-semibold text-on-surface">Customer note</p>
      <p className="text-on-surface-variant">Shown to the customer on their order history. Leave empty to clear it.</p>
      {templates.length > 0 && (
        <select
          className="input-field !py-1.5 text-xs"
          value=""
          onChange={(e) => { applyTemplate(e.target.value); e.target.value = ""; }}
        >
          <option value="">Insert a saved comment…</option>
          {templates.map((tmpl) => (
            <option key={tmpl.id} value={tmpl.id}>{tmpl.text.slice(0, 80)}{tmpl.text.length > 80 ? "…" : ""}</option>
          ))}
        </select>
      )}
      <textarea
        className="input-field min-h-[70px] text-xs"
        placeholder="e.g. আপনার UID ভুল। চেক করে আবার অর্ডার করুন।"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <input
        type="url"
        className="input-field !py-1.5 text-xs"
        placeholder="Optional link (WhatsApp / reorder / help article)"
        value={link}
        onChange={(e) => setLink(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-primary !min-h-[36px] !px-4 !py-1.5 text-xs"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ comment: text.trim() || null, commentLink: link.trim() || null })}
        >
          {mutation.isPending ? "Saving…" : "Comment Save"}
        </button>
        {order.adminComment && (
          <button
            type="button"
            className="btn-ghost !min-h-[36px] !px-3 !py-1.5 text-xs text-error"
            disabled={mutation.isPending}
            onClick={() => { setText(""); setLink(""); mutation.mutate({ comment: null, commentLink: null }); }}
          >
            Clear note
          </button>
        )}
        {order.adminCommentUpdatedAt && (
          <span className="text-[11px] text-on-surface-variant">
            saved {new Date(order.adminCommentUpdatedAt).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

const RESENDABLE = new Set(["PENDING", "FAILED"]);

type RefillRow = {
  id: string;
  status: string;
  providerRefillId: string | null;
  note: string | null;
  createdAt: string;
  order: { id: string; service: { name: string }; user: { username: string } };
};

const REFILL_STATUS_TONE: Record<string, BadgeTone> = {
  REQUESTED: "warning",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  REJECTED: "error",
};

function RefillRequestsPanel() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("REQUESTED");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-refills", status],
    queryFn: () => getAdminRefills({ page: 1, pageSize: 50, status: status || undefined }),
  });

  async function onResolve(id: string, next: "COMPLETED" | "REJECTED") {
    try {
      await resolveAdminRefill(id, { status: next });
      toast.push(`Refill marked ${next.toLowerCase()}.`, "success");
      queryClient.invalidateQueries({ queryKey: ["admin-refills"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to resolve refill"), "error");
    }
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold">Refill requests</h2>
        <select className="input-field w-full sm:w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="REQUESTED">Requested (needs action)</option>
          <option value="IN_PROGRESS">In progress (auto)</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Requested</th>
              <th className="px-3 py-2">Resolve</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading && <tr><td colSpan={6} className="px-3 py-4 text-center text-on-surface-variant">Loading…</td></tr>}
            {!isLoading && data?.items.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6"><EmptyState icon="refresh" title="No refill requests" /></td></tr>
            )}
            {data?.items.map((r: RefillRow) => (
              <tr key={r.id} className="row-hover">
                <td className="px-3 py-2">{r.order.user.username}</td>
                <td className="px-3 py-2">{r.order.service.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-on-surface-variant">{r.order.id.slice(0, 8)}</td>
                <td className="px-3 py-2"><Badge tone={REFILL_STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge></td>
                <td className="px-3 py-2 text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  {r.status === "REQUESTED" ? (
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-ghost !min-h-[36px] !px-3 !py-1.5 text-xs" onClick={() => onResolve(r.id, "COMPLETED")}>Mark done</button>
                      <button className="btn-ghost !min-h-[36px] !px-3 !py-1.5 text-xs text-error" onClick={() => onResolve(r.id, "REJECTED")}>Reject</button>
                    </div>
                  ) : (
                    <span className="text-xs text-on-surface-variant">
                      {r.status === "IN_PROGRESS" ? "Awaiting provider" : "Resolved"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  // Deep-linked from the dashboard's "More info" cards (from/to/likeOnly) —
  // read once on mount so a link like /admin/orders?from=...&to=...&status=
  // COMPLETED actually lands on the filtered view it promises, not just a
  // filtered-looking URL.
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: adminSettings } = useQuery({ queryKey: ["admin-settings"], queryFn: getAdminSettings, staleTime: 60_000 });
  const resendEnabled = (adminSettings as { resendOrderButtonEnabled?: boolean } | undefined)?.resendOrderButtonEnabled ?? false;
  const { data: commentTemplates } = useQuery({ queryKey: ["comment-templates"], queryFn: getCommentTemplates, staleTime: 60_000 });
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const likeOnly = searchParams.get("likeOnly") === "true";
  const hasDateFilter = Boolean(from || to || likeOnly);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", status, search, page, from, to, likeOnly],
    queryFn: () =>
      getAdminOrders({
        page,
        pageSize: 20,
        status: status || undefined,
        search: search || undefined,
        from,
        to,
        likeOnly: likeOnly || undefined,
      }),
  });

  function clearDateFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete("from");
    next.delete("to");
    next.delete("likeOnly");
    setSearchParams(next);
    setPage(1);
  }

  async function onCopyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      // clipboard unavailable — no-op
    }
  }

  async function onStatusChange(id: string, newStatus: string) {
    try {
      await updateAdminOrderStatus(id, { status: newStatus as never });
      toast.push("Order status updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to update order"), "error");
    }
  }

  const resendMutation = useMutation({
    mutationFn: (id: string) => resendAdminOrder(id),
    onSuccess: (order: { status: string }) => {
      toast.push(`Order resent — now ${String(order.status).toLowerCase()}.`, "success");
    },
    onError: (err) => {
      // The provider error is already saved to the order; surface it and let
      // the list refetch show the updated apiErrorResponse.
      toast.push(apiErrorMessage(err, "Resend failed — provider rejected the order"), "error");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Orders" }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Orders</h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="input-field w-full sm:w-auto" placeholder="Search ID / link / username" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className="input-field w-full sm:w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {OrderStatusValues.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {hasDateFilter && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="primary">
            Date-filtered{likeOnly ? " · Like orders only" : ""}
          </Badge>
          <button type="button" className="btn-ghost !min-h-0 !px-2 !py-1 text-xs" onClick={clearDateFilter}>
            Clear filter
          </button>
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3" />
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Charge</th>
              <th className="px-4 py-3">Profit</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading && <tr><td colSpan={9} className="px-4 py-6 text-center text-on-surface-variant">Loading…</td></tr>}
            {(data?.items as AdminOrderRow[] | undefined)?.map((o) => {
              const expanded = expandedId === o.id;
              const hasError = !!o.apiErrorResponse;
              const canResend = resendEnabled && RESENDABLE.has(o.status);
              const resending = resendMutation.isPending && resendMutation.variables === o.id;
              return (
              <Fragment key={o.id}>
              <tr className="row-hover">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high"
                    onClick={() => setExpandedId(expanded ? null : o.id)}
                    aria-label={expanded ? "Collapse order details" : "Expand order details"}
                    aria-expanded={expanded}
                  >
                    <Icon name={expanded ? "chevron-down" : "chevron-right"} size={16} />
                  </button>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center gap-1 sm:min-h-0"
                    onClick={() => onCopyId(o.id)}
                    aria-label="Copy full order ID"
                    title={o.id}
                  >
                    {o.id.slice(0, 8)}
                    <span className="text-[10px] text-primary">{copiedId === o.id ? "Copied" : "Copy"}</span>
                  </button>
                </td>
                <td className="px-4 py-3">{o.user.username}</td>
                <td className="px-4 py-3">
                  {o.service ? o.service.name : o.package ? `${o.package.product.brand.name} — ${o.package.product.name} — ${o.package.name}` : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-success">${o.charge}</td>
                <td className="px-4 py-3 font-mono text-info">${(Number(o.charge) - Number(o.providerCost)).toFixed(4)}</td>
                <td className="px-4 py-3 font-mono">{o.quantity}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={o.status} />
                    {hasError && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : o.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-error/15 px-2 py-0.5 text-[10px] font-semibold text-error"
                        title="A provider API error was recorded for this order — click to view"
                      >
                        <Icon name="warning" size={11} /> API error
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select className="input-field !py-1.5 text-xs" value={o.status} onChange={(e) => onStatusChange(o.id, e.target.value)}>
                    {OrderStatusValues.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
              {expanded && (
                <tr className="bg-surface-container-high/40">
                  <td colSpan={9} className="px-4 py-4">
                    <div className="grid gap-3 text-xs sm:grid-cols-2">
                      <div className="space-y-1">
                        <p><span className="text-on-surface-variant">Order ID:</span> <span className="font-mono">{o.id}</span></p>
                        <p><span className="text-on-surface-variant">Link / target:</span> <span className="break-all font-mono">{o.link}</span></p>
                        <p><span className="text-on-surface-variant">Mode:</span> {o.mode}</p>
                        <p><span className="text-on-surface-variant">Provider ref:</span> <span className="font-mono">{o.providerOrderId ?? "—"}</span></p>
                        <p><span className="text-on-surface-variant">Placed:</span> {new Date(o.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="space-y-2">
                        {hasError ? (
                          <div>
                            <p className="mb-1 font-semibold text-error">Last provider API error</p>
                            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-control border border-error/30 bg-error/10 p-2 font-mono text-[11px] text-error">
                              {o.apiErrorResponse}
                            </pre>
                          </div>
                        ) : (
                          <p className="text-on-surface-variant">No provider API error recorded.</p>
                        )}
                        {resendEnabled && RESENDABLE.has(o.status) && (
                          <button
                            type="button"
                            className="btn-primary !min-h-[36px] !px-4 !py-1.5 text-xs"
                            disabled={!canResend || resending}
                            onClick={() => resendMutation.mutate(o.id)}
                          >
                            {resending ? "Resending…" : "Resend to provider"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 text-xs">
                      <OrderNoteEditor key={o.id} order={o} templates={commentTemplates ?? []} />
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && data.total > data.pageSize && (
        <Pagination page={page} totalPages={Math.ceil(data.total / data.pageSize)} onChange={setPage} />
      )}

      <RefillRequestsPanel />
    </div>
  );
}
