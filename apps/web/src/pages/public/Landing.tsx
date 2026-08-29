import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicServices, getPublicStats } from "../../api/resources.js";
import { useCurrency } from "../../context/CurrencyContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import BannerSlider from "../../components/ui/BannerSlider.js";
import { Badge, Card } from "../../components/ds/index.js";

interface PublicService {
  id: string;
  name: string;
  sellPricePer1000: string;
  category: { name: string; platform: string };
}

// The sign-in form used to live here as a hero-column card — moved out per
// the "browse first, login only when needed" guest-access model: a visitor
// who hasn't decided to sign up yet shouldn't be greeted by a login form as
// the first thing they see. Login/Sign up now live only as the small
// top-navbar buttons PublicLayout already renders for a logged-out visitor
// (see components/layout/PublicLayout.tsx) — not as blocking hero content.

function StatsBar({ startingPrice }: { startingPrice: string | null }) {
  const { t } = useLanguage();
  const { data: stats } = useQuery({ queryKey: ["public-stats"], queryFn: getPublicStats });

  // Every number here is a real DB aggregate (getPublicStats) or the actual
  // cheapest active service price — never a fabricated "15M+ orders" style
  // claim, per the project's existing "never fake trust numbers" rule.
  const cards = [
    { label: t("landing.stats.registeredUsers"), value: stats ? stats.totalUsers.toLocaleString() : "—" },
    { label: t("landing.stats.ordersCompleted"), value: stats ? stats.totalOrdersCompleted.toLocaleString() : "—" },
    { label: t("landing.stats.startingPrice"), value: startingPrice ?? "—" },
    { label: t("landing.stats.support"), value: "24/7" },
  ];

  return (
    <div className="border-y border-outline-variant/60 bg-surface-container/30">
      <div className="mx-auto grid max-w-container grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4 sm:px-6">
        {cards.map((c) => (
          <div key={c.label} className="text-center">
            <p className="font-mono text-2xl font-bold text-accent-on-dark sm:text-3xl">{c.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.05em] text-on-surface-variant">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const [search, setSearch] = useState("");
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const { data: servicesPage } = useQuery({
    queryKey: ["public-services", { pageSize: 100 }],
    queryFn: () => getPublicServices({ pageSize: 100 }),
  });

  const services: PublicService[] = useMemo(() => servicesPage?.items ?? [], [servicesPage]);
  const startingPrice = useMemo(() => {
    if (services.length === 0) return null;
    const min = Math.min(...services.map((s) => Number(s.sellPricePer1000)));
    return formatCurrency(min);
  }, [services, formatCurrency]);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return services.filter((s) => s.name.toLowerCase().includes(q) || s.category.platform.toLowerCase().includes(q)).slice(0, 8);
  }, [services, search]);

  const platforms = useMemo(() => Array.from(new Set(services.map((s) => s.category.platform))).slice(0, 6), [services]);

  return (
    <div>
      <div className="mx-auto max-w-container px-4 pt-4 sm:px-6 sm:pt-6">
        <BannerSlider />
      </div>

      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-1/3 left-1/4 h-[50rem] w-[50rem] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #6D28D9 0%, transparent 65%)" }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-container px-4 py-16 text-center sm:px-6 lg:py-24">
          <Badge tone="success" className="mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> {t("landing.badge")}
          </Badge>
          <h1 className="mx-auto font-display text-3xl font-bold leading-tight text-on-surface sm:text-4xl md:text-5xl lg:text-6xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-on-surface-variant">
            {t("landing.heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/services" className="btn-primary w-full sm:w-auto">{t("landing.viewServices")}</Link>
            <Link to="/api-docs" className="btn-ghost w-full border border-outline-variant sm:w-auto">{t("landing.apiDocumentation")}</Link>
          </div>

          <div className="relative mx-auto mt-10 max-w-md text-left">
            <input
              className="input-field"
              placeholder={t("landing.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {filtered.length > 0 && (
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-control border border-outline-variant bg-surface-card shadow-overlay">
                {filtered.map((s) => (
                  <Link
                    key={s.id}
                    to="/services"
                    className="flex items-center justify-between px-3 py-2 text-sm hover:bg-surface-container-high"
                  >
                    <span>
                      {s.name} <span className="text-xs text-on-surface-variant">· {s.category.platform}</span>
                    </span>
                    <span className="font-mono text-xs text-primary">{formatCurrency(s.sellPricePer1000)}/1K</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <StatsBar startingPrice={startingPrice} />

      <section className="mx-auto max-w-container px-4 py-16 sm:px-6">
        <h2 className="text-center font-display text-2xl font-bold text-on-surface sm:text-3xl">{t("landing.whyHeading")}</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["delivery", "pricing", "api", "support"] as const).map((key) => (
            <Card key={key} interactive>
              <p className="font-semibold text-on-surface">{t(`landing.features.${key}.title`)}</p>
              <p className="mt-1 text-sm text-on-surface-variant">{t(`landing.features.${key}.body`)}</p>
            </Card>
          ))}
        </div>
      </section>

      {platforms.length > 0 && (
        <section className="border-t border-outline-variant/60 bg-surface-container/20 py-10">
          <div className="mx-auto max-w-container px-4 text-center sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-on-surface-variant">{t("landing.platformsHeading")}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {platforms.map((p) => (
                <span key={p} className="inline-flex items-center rounded-full border border-outline-variant px-3.5 py-1.5 text-sm font-medium text-on-surface-variant">{p}</span>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
