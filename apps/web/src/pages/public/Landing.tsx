import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicServices, getPublicStats } from "../../api/resources.js";
import { useAuth } from "../../context/AuthContext.js";
import { useCurrency } from "../../context/CurrencyContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { FullPageSpinner } from "../../routes/guards.js";
import BannerSlider from "../../components/ui/BannerSlider.js";
import Reveal from "../../components/landing/Reveal.js";
import HeroSection, { type HeroSearchResult } from "../../components/landing/HeroSection.js";
import LiveDashboardCard from "../../components/landing/LiveDashboardCard.js";
import TrustBar from "../../components/landing/TrustBar.js";
import WhyChoose from "../../components/landing/WhyChoose.js";
import PlatformsGrid from "../../components/landing/PlatformsGrid.js";
import HowItWorks from "../../components/landing/HowItWorks.js";
import Testimonials from "../../components/landing/Testimonials.js";
import PaymentMethods from "../../components/landing/PaymentMethods.js";
import "../../styles/landing.css";

interface PublicService {
  id: string;
  name: string;
  sellPricePer1000: string;
  category: { name: string; platform: string };
}

// Public homepage — redesigned to the "stitch_all_in_one_smm_redesign" spec
// (dark "command center" glassmorphism, violet + cyan). All data is real:
// getPublicStats aggregates + the live service catalogue drive the hero
// search, the dashboard-preview metrics and the platforms grid. The tabbed
// Login / Sign Up box (AuthPanel) stays embedded in the hero so a guest can
// authenticate without leaving "/".
export default function Landing() {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState("");
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();

  const { data: stats } = useQuery({ queryKey: ["public-stats"], queryFn: getPublicStats, enabled: !user });

  const { data: servicesPage } = useQuery({
    queryKey: ["public-services", { pageSize: 100 }],
    queryFn: () => getPublicServices({ pageSize: 100 }),
    enabled: !user, // a logged-in visitor is about to be redirected away
  });

  const services: PublicService[] = useMemo(() => servicesPage?.items ?? [], [servicesPage]);

  const startingPrice = useMemo(() => {
    if (services.length === 0) return null;
    const min = Math.min(...services.map((s) => Number(s.sellPricePer1000)));
    return formatCurrency(min);
  }, [services, formatCurrency]);

  const searchResults: HeroSearchResult[] = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return services
      .filter((s) => s.name.toLowerCase().includes(q) || s.category.platform.toLowerCase().includes(q))
      .slice(0, 6)
      .map((s) => ({
        id: s.id,
        name: s.name,
        platform: s.category.platform,
        priceText: formatCurrency(s.sellPricePer1000),
      }));
  }, [services, search, formatCurrency]);

  const platforms = useMemo(
    () => Array.from(new Set(services.map((s) => s.category.platform))).filter(Boolean),
    [services],
  );

  // ── Session check & auto-redirect ─────────────────────────────────────
  if (loading) return <FullPageSpinner />;
  if (user) {
    const home = user.role === "ADMIN" || user.role === "MODERATOR" ? "/admin" : "/dashboard";
    return <Navigate to={home} replace />;
  }

  return (
    <div className="overflow-x-clip bg-l-bg font-body text-l-body">
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        <BannerSlider />
      </div>

      <HeroSection search={search} onSearchChange={setSearch} results={searchResults} />

      {/* Live dashboard preview — real metrics + product snapshot */}
      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-16">
        <Reveal className="mx-auto grid max-w-6xl items-center gap-6 sm:gap-8 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-l-primary-bright sm:text-xs sm:tracking-[0.2em]">
              {t("landing.preview.eyebrow")}
            </span>
            <h2 className="mt-3 font-headline text-[25px] font-bold leading-tight tracking-tight text-l-heading sm:text-3xl lg:text-4xl">
              {t("landing.preview.title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-l-body sm:mt-4 sm:text-base">
              {t("landing.preview.subtitle")}
            </p>
          </div>
          <LiveDashboardCard stats={stats} startingPrice={startingPrice} />
        </Reveal>
      </section>

      <TrustBar />
      <WhyChoose />
      <PlatformsGrid platforms={platforms} />
      <HowItWorks />
      <Testimonials />
      <PaymentMethods />
    </div>
  );
}
