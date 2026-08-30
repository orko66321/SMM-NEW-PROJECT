import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAdminTicketCategories, getAdminTickets } from "../../api/resources.js";
import { Breadcrumbs, EmptyState, StatusBadge } from "../../components/ds/index.js";

const STATUSES = [
  "OPEN",
  "AI_PROCESSING",
  "RESOLVED",
  "ESCALATED",
  "PENDING_ADMIN",
  "PENDING_USER",
  "IN_PROGRESS",
  "REPLIED",
  "CLOSED",
];

export default function AdminTickets() {
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const { data: categories } = useQuery({ queryKey: ["admin-ticket-categories"], queryFn: getAdminTicketCategories });
  const { data } = useQuery({
    queryKey: ["admin-tickets", status, categoryId],
    queryFn: () => getAdminTickets({ page: 1, pageSize: 50, status: status || undefined, categoryId: categoryId || undefined }),
  });

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Support Tickets" }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Support Tickets</h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select className="input-field w-full sm:max-w-xs" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select className="input-field w-full sm:max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card p-0">
        <ul className="divide-y divide-outline-variant">
          {data?.items.map((t: { id: string; subject: string; status: string; user: { username: string }; updatedAt: string; category?: { name: string } | null; subcategory?: { name: string } | null }) => (
            <li key={t.id}>
              <Link
                to={`/admin/tickets/${t.id}`}
                className="flex flex-col gap-1 px-4 py-3 text-sm hover:text-primary sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="font-medium sm:font-normal">
                  {t.subject}
                  {t.category && (
                    <span className="ml-2 text-xs text-on-surface-variant">
                      {t.category.name}{t.subcategory ? ` · ${t.subcategory.name}` : ""}
                    </span>
                  )}
                </span>
                <span className="flex flex-wrap items-center gap-3">
                  <span className="text-on-surface-variant">@{t.user.username}</span>
                  <span className="text-xs text-on-surface-variant">{new Date(t.updatedAt).toLocaleDateString()}</span>
                  <StatusBadge status={t.status} kind="ticket" />
                </span>
              </Link>
            </li>
          ))}
          {data?.items.length === 0 && <EmptyState icon="support" title="No tickets" />}
        </ul>
      </div>
    </div>
  );
}
