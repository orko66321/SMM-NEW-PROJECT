import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { getAdminUsers } from "../../api/resources.js";
import { Badge, Breadcrumbs, EmptyState, Pagination } from "../../components/ds/index.js";

export default function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // Deep-linked from the dashboard's "Today User" / "Total User" cards.
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const hasDateFilter = Boolean(from || to);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, page, from, to],
    queryFn: () => getAdminUsers({ page, pageSize: 20, search: search || undefined, from, to }),
  });

  function clearDateFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete("from");
    next.delete("to");
    setSearchParams(next);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Users" }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Users</h1>
        <input
          className="input-field w-full sm:max-w-xs"
          placeholder="Search username or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {hasDateFilter && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="primary">Date-filtered</Badge>
          <button type="button" className="btn-ghost !min-h-0 !px-2 !py-1 text-xs" onClick={clearDateFilter}>
            Clear filter
          </button>
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading && <tr><td colSpan={7} className="px-4 py-6 text-center text-on-surface-variant">Loading…</td></tr>}
            {!isLoading && data?.items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6"><EmptyState icon="users" title="No users found" /></td></tr>
            )}
            {data?.items.map((u: { id: string; username: string; email: string; balance: string; ordersCount: number; role: string; status: string; createdAt: string }) => (
              <tr key={u.id} className="row-hover">
                <td className="px-4 py-3">
                  <Link to={`/admin/users/${u.id}`} className="font-medium text-accent-on-dark hover:underline">{u.username}</Link>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{u.email}</td>
                <td className="px-4 py-3 font-mono text-success">${u.balance}</td>
                <td className="px-4 py-3 font-mono">{u.ordersCount}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">
                  <Badge tone={u.status === "ACTIVE" ? "success" : "error"}>{u.status}</Badge>
                </td>
                <td className="px-4 py-3 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > data.pageSize && (
        <Pagination page={page} totalPages={Math.ceil(data.total / data.pageSize)} onChange={setPage} />
      )}
    </div>
  );
}
