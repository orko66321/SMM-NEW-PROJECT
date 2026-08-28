import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getCategories, getServices } from "../../api/resources.js";

interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  minQuantity: number;
  maxQuantity: number;
  sellPricePer1000: string;
  providerServiceId: string | null;
}

function ServiceCard({ s }: { s: ServiceRow }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug text-on-surface">{s.name}</p>
          {s.providerServiceId && (
            <span className="badge mt-1.5 bg-surface-container-high font-mono text-[11px] text-on-surface-variant">
              ID {s.providerServiceId}
            </span>
          )}
        </div>
        <p className="shrink-0 whitespace-nowrap text-right font-mono text-base font-semibold text-success">
          ${s.sellPricePer1000}
          <span className="ml-0.5 block text-[10px] font-normal text-on-surface-variant">/1000</span>
        </p>
      </div>

      {s.description && (
        <p className="mt-2 whitespace-pre-line text-xs text-on-surface-variant">{s.description}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-outline-variant pt-3">
        <p className="text-xs text-on-surface-variant">
          Min <span className="font-mono text-on-surface">{s.minQuantity}</span> · Max{" "}
          <span className="font-mono text-on-surface">{s.maxQuantity}</span>
        </p>
        <Link to={`/dashboard/new-order?serviceId=${s.id}`} className="btn-primary !min-h-[38px] shrink-0 !px-4 !py-2 text-xs">
          Order now
        </Link>
      </div>
    </div>
  );
}

export default function Services() {
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const { data, isLoading } = useQuery({
    queryKey: ["services-catalog", categoryId, search],
    queryFn: () => getServices({ page: 1, pageSize: 100, categoryId: categoryId || undefined, search: search || undefined }),
  });

  const items: ServiceRow[] = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Services</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Browse the full catalog and jump straight into ordering.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            className="input-field pl-9"
            placeholder="Search by name or exact ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field sm:max-w-xs" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories?.map((c: { id: string; name: string; platform: string }) => (
            <option key={c.id} value={c.id}>{c.platform} — {c.name}</option>
          ))}
        </select>
      </div>

      {!isLoading && (
        <p className="text-xs text-on-surface-variant">
          {items.length} service{items.length === 1 ? "" : "s"} found
        </p>
      )}

      {/* Mobile: stacked cards */}
      <div className="space-y-3 md:hidden">
        {isLoading && <p className="card text-center text-sm text-on-surface-variant">Loading…</p>}
        {!isLoading && items.length === 0 && (
          <p className="card text-center text-sm text-on-surface-variant">No services match your search.</p>
        )}
        {items.map((s) => (
          <ServiceCard key={s.id} s={s} />
        ))}
      </div>

      {/* Desktop / tablet: table */}
      <div className="card hidden overflow-x-auto p-0 md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-outline-variant text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Min / Max</th>
              <th className="px-4 py-3">Price / 1000</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-on-surface-variant">Loading…</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-on-surface-variant">No services match your search.</td></tr>
            )}
            {items.map((s) => (
              <tr key={s.id} className="transition hover:bg-surface-container-high/60">
                <td className="px-4 py-3">
                  {s.providerServiceId ? (
                    <span className="badge bg-surface-container-high font-mono text-on-surface-variant">{s.providerServiceId}</span>
                  ) : (
                    <span className="text-xs text-on-surface-variant">—</span>
                  )}
                </td>
                <td className="max-w-[320px] px-4 py-3">
                  <p>{s.name}</p>
                  {s.description && <p className="mt-0.5 truncate text-xs text-on-surface-variant" title={s.description}>{s.description}</p>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{s.minQuantity} / {s.maxQuantity}</td>
                <td className="px-4 py-3 font-mono text-success">${s.sellPricePer1000}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/dashboard/new-order?serviceId=${s.id}`} className="btn-primary !min-h-0 !px-3 !py-1.5 text-xs">
                    Order now
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
