import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAdminTickets } from "../../api/resources.js";

export default function AdminTickets() {
  const [status, setStatus] = useState("");
  const { data } = useQuery({ queryKey: ["admin-tickets", status], queryFn: () => getAdminTickets({ page: 1, pageSize: 50, status: status || undefined }) });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Support Tickets</h1>
        <select className="input-field w-full sm:max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="OPEN">Open</option>
          <option value="PENDING_ADMIN">Pending Admin</option>
          <option value="PENDING_USER">Pending User</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="card p-0">
        <ul className="divide-y divide-outline-variant">
          {data?.items.map((t: { id: string; subject: string; status: string; user: { username: string }; updatedAt: string }) => (
            <li key={t.id}>
              <Link
                to={`/admin/tickets/${t.id}`}
                className="flex flex-col gap-1 px-4 py-3 text-sm hover:text-primary sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="font-medium sm:font-normal">{t.subject}</span>
                <span className="flex flex-wrap items-center gap-3">
                  <span className="text-on-surface-variant">@{t.user.username}</span>
                  <span className="text-xs text-on-surface-variant">{new Date(t.updatedAt).toLocaleDateString()}</span>
                  <span className="badge bg-primary/15 text-primary">{t.status}</span>
                </span>
              </Link>
            </li>
          ))}
          {data?.items.length === 0 && <p className="px-4 py-6 text-center text-sm text-on-surface-variant">No tickets.</p>}
        </ul>
      </div>
    </div>
  );
}
