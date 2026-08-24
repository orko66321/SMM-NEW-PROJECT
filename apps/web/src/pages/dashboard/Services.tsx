import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getCategories, getServices } from "../../api/resources.js";

export default function Services() {
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const { data } = useQuery({
    queryKey: ["services-catalog", categoryId, search],
    queryFn: () => getServices({ page: 1, pageSize: 100, categoryId: categoryId || undefined, search: search || undefined }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Services</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="input-field sm:max-w-xs"
          placeholder="Search by name or exact product ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input-field sm:max-w-xs" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories?.map((c: { id: string; name: string; platform: string }) => (
            <option key={c.id} value={c.id}>{c.platform} — {c.name}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
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
            {data?.items.map((s: { id: string; name: string; minQuantity: number; maxQuantity: number; sellPricePer1000: string; providerServiceId: string | null }) => (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  {s.providerServiceId ? (
                    <span className="badge bg-surface-container-high font-mono text-on-surface-variant">{s.providerServiceId}</span>
                  ) : (
                    <span className="text-xs text-on-surface-variant">—</span>
                  )}
                </td>
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{s.minQuantity} / {s.maxQuantity}</td>
                <td className="px-4 py-3 font-mono text-success">${s.sellPricePer1000}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/dashboard/new-order?serviceId=${s.id}`} className="btn-primary !px-3 !py-1.5 text-xs">
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
