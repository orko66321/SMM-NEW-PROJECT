import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicCategories, getPublicServices } from "../../api/resources.js";
import { useCurrency } from "../../context/CurrencyContext.js";

interface Category {
  id: string;
  name: string;
  platform: string;
}

interface PublicService {
  id: string;
  name: string;
  description: string | null;
  sellPricePer1000: string;
  minQuantity: number;
  maxQuantity: number;
  refillEnabled: boolean;
  cancelEnabled: boolean;
  category: { name: string; platform: string };
}

const PLATFORM_ORDER = ["Facebook", "Instagram", "TikTok", "YouTube", "Telegram"];

export default function PublicServices() {
  const { formatCurrency } = useCurrency();
  const [platform, setPlatform] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: categories } = useQuery({ queryKey: ["public-categories"], queryFn: getPublicCategories });
  const { data: servicesPage, isLoading } = useQuery({
    queryKey: ["public-services", { pageSize: 100 }],
    queryFn: () => getPublicServices({ pageSize: 100 }),
  });

  const services: PublicService[] = useMemo(() => servicesPage?.items ?? [], [servicesPage]);

  const platforms = useMemo(() => {
    const fromCategories = new Set<string>((categories ?? []).map((c: Category) => c.platform));
    // Known platforms first (per the request), then any others the catalog actually has.
    const known = PLATFORM_ORDER.filter((p) => fromCategories.has(p));
    const rest = Array.from(fromCategories).filter((p) => !PLATFORM_ORDER.includes(p)).sort();
    return [...known, ...rest];
  }, [categories]);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchesPlatform = !platform || s.category.platform === platform;
      const matchesSearch = !search.trim() || s.name.toLowerCase().includes(search.toLowerCase());
      return matchesPlatform && matchesSearch;
    });
  }, [services, platform, search]);

  return (
    <div className="mx-auto max-w-container px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-on-surface">Services Catalog</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Live rates, pulled straight from the same catalog customers order from — nothing here is a stale price sheet.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPlatform(null)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              platform === null ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant"
            }`}
          >
            All
          </button>
          {platforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                platform === p ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          className="input-field sm:w-64"
          placeholder="Search services…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Mobile: stacked cards (no horizontal scrolling needed on a customer-facing catalog). */}
      <div className="mt-6 space-y-3 md:hidden">
        {filtered.map((s) => (
          <div key={s.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-on-surface">{s.name}</p>
              <span className="whitespace-nowrap font-mono text-sm text-primary">{formatCurrency(s.sellPricePer1000)}</span>
            </div>
            {s.description && <p className="mt-1 text-xs text-on-surface-variant">{s.description}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant">
              <span>{s.category.platform}</span>
              <span className="font-mono">Min/Max: {s.minQuantity} – {s.maxQuantity}</span>
            </div>
            {(s.refillEnabled || s.cancelEnabled) && (
              <div className="mt-3 flex gap-1.5">
                {s.refillEnabled && <span className="badge bg-info/15 text-info">Refill</span>}
                {s.cancelEnabled && <span className="badge bg-warning/15 text-warning">Cancel</span>}
              </div>
            )}
          </div>
        ))}
        {!isLoading && filtered.length === 0 && (
          <p className="rounded-lg border border-outline-variant px-4 py-8 text-center text-on-surface-variant">No services match your filters.</p>
        )}
      </div>

      {/* Desktop/tablet: full table. */}
      <div className="mt-6 hidden overflow-x-auto rounded-lg border border-outline-variant md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface-container-high text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">Rate / 1K</th>
              <th className="px-4 py-3">Min / Max</th>
              <th className="px-4 py-3">Badges</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-surface-container/40">
                <td className="px-4 py-3">
                  <p className="font-medium text-on-surface">{s.name}</p>
                  {s.description && <p className="text-xs text-on-surface-variant">{s.description}</p>}
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{s.category.platform}</td>
                <td className="px-4 py-3 font-mono text-primary">{formatCurrency(s.sellPricePer1000)}</td>
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{s.minQuantity} – {s.maxQuantity}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {s.refillEnabled && <span className="badge bg-info/15 text-info">Refill</span>}
                    {s.cancelEnabled && <span className="badge bg-warning/15 text-warning">Cancel</span>}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">No services match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-lg border border-primary/30 bg-primary/5 p-6 text-center">
        <p className="font-semibold text-on-surface">Ready to order?</p>
        <p className="mt-1 text-sm text-on-surface-variant">Create a free account and fund your wallet in seconds.</p>
        <Link to="/register" className="btn-primary mt-4 inline-block">Sign up</Link>
      </div>
    </div>
  );
}
