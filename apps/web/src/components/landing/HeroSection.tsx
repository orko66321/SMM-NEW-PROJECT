import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext.js";
import { Icon } from "../ds/index.js";
import AuthPanel from "../auth/AuthPanel.js";
import { cssVars } from "./cssVar.js";

export interface HeroSearchResult {
  id: string;
  name: string;
  platform: string;
  priceText: string;
}

const rise = (ms: number) => cssVars({ "--ll-delay": `${ms}ms` });

export default function HeroSection({
  search,
  onSearchChange,
  results,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  results: HeroSearchResult[];
}) {
  const { t } = useLanguage();

  const trustPoints = [
    t("landing.hero.trustInstant"),
    t("landing.hero.trust247"),
    t("landing.hero.trustApi"),
  ];

  return (
    <section className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-24">
      {/* Ambient chromatic glows */}
      <div
        className="ll-float-slow pointer-events-none absolute -top-40 left-1/4 -z-10 h-96 w-96 rounded-full bg-l-primary/20 blur-[120px]"
        aria-hidden
      />
      <div
        className="ll-float-delayed pointer-events-none absolute right-0 top-1/3 -z-10 h-80 w-80 rounded-full bg-l-accent/15 blur-[120px]"
        aria-hidden
      />

      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-10">
        {/* Left — marketing copy + search. min-w-0: a grid item won't shrink
            below its content's intrinsic width by default, which pushed this
            column ~19px past its track (clipped, no right margin) on phones. */}
        <div className="min-w-0 text-center lg:text-left">
          <span
            className="ll-rise inline-flex w-fit items-center gap-2 rounded-full border border-l-border bg-l-surface px-4 py-1.5"
            style={rise(0)}
          >
            <span className="size-2 animate-pulse rounded-full bg-l-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-l-accent">
              {t("landing.badge")}
            </span>
          </span>

          <h1
            className="ll-rise mt-5 font-headline text-[27px] font-extrabold leading-[1.15] tracking-tight text-l-heading sm:text-5xl sm:leading-[1.1] lg:text-6xl"
            style={rise(80)}
          >
            {t("landing.heroTitle")}
          </h1>

          <p className="ll-rise mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-l-body sm:mt-5 sm:text-lg lg:mx-0" style={rise(160)}>
            {t("landing.heroSubtitle")}
          </p>

          <div
            className="ll-rise mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start"
            style={rise(240)}
          >
            <Link
              to="/services"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-l-primary-bright to-l-primary px-6 py-3 text-[15px] font-bold text-white shadow-lg shadow-l-primary/30 transition-all hover:scale-[1.02] hover:shadow-l-primary/50 active:scale-[0.98] sm:px-7 sm:py-3.5 sm:text-base"
            >
              {t("landing.viewServices")}
            </Link>
            <Link
              to="/api-docs"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-l-border bg-l-surface px-6 py-3 text-[15px] font-bold text-l-heading transition-all hover:border-l-primary/40 hover:bg-l-surface-2 sm:px-7 sm:py-3.5 sm:text-base"
            >
              <Icon name="docs" size={18} />
              {t("landing.apiDocumentation")}
            </Link>
          </div>

          {/* Service search + live autocomplete */}
          <div className="ll-rise relative mx-auto mt-6 max-w-md text-left sm:mt-7 lg:mx-0" style={rise(320)}>
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-l-muted">
              <Icon name="search" size={18} />
            </span>
            <input
              className="h-12 w-full rounded-xl border border-l-border bg-l-surface pl-11 pr-4 text-sm text-l-heading placeholder:text-l-muted outline-none transition focus:border-l-primary focus:ring-2 focus:ring-l-primary/30"
              placeholder={t("landing.searchPlaceholder")}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label={t("landing.searchPlaceholder")}
            />
            {results.length > 0 && (
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-l-border bg-l-surface shadow-2xl">
                {results.map((s) => (
                  <Link
                    key={s.id}
                    to="/services"
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm transition-colors hover:bg-l-surface-2"
                  >
                    <span className="truncate text-l-body">
                      {s.name} <span className="text-xs text-l-muted">· {s.platform}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-l-primary-bright">{s.priceText}/1K</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div
            className="ll-rise mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-l-body lg:justify-start"
            style={rise(400)}
          >
            {trustPoints.map((point) => (
              <span key={point} className="flex items-center gap-1.5">
                <Icon name="check-circle" size={16} className="text-l-accent" />
                {point}
              </span>
            ))}
          </div>
        </div>

        {/* Right — embedded Login / Sign Up (existing conversion feature) */}
        <div className="ll-rise mx-auto w-full min-w-0 max-w-md lg:mx-0 lg:ml-auto" style={rise(300)}>
          <div className="relative">
            {/* Glow inset (not -inset) so it can never add horizontal overflow. */}
            <div
              className="pointer-events-none absolute inset-4 -z-10 rounded-full bg-l-primary/15 blur-3xl"
              aria-hidden
            />
            <AuthPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
