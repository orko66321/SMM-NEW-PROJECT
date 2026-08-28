import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicServices, getPublicStats } from "../../api/resources.js";
import { useAuth } from "../../context/AuthContext.js";
import { useCurrency } from "../../context/CurrencyContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton.js";
import BannerSlider from "../../components/ui/BannerSlider.js";

interface PublicService {
  id: string;
  name: string;
  sellPricePer1000: string;
  category: { name: string; platform: string };
}

function SignInCard() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ identifier, password });
      toast.push(t("auth.login.welcomeToast"), "success");
      navigate("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, t("auth.login.failedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-outline-variant/60 bg-surface-container/60 p-8 shadow-2xl shadow-primary/10 backdrop-blur-xl">
      <h2 className="text-center text-xl font-bold text-on-surface">{t("landing.signInCard.title")}</h2>
      <p className="mb-6 mt-1 text-center text-sm text-on-surface-variant">{t("landing.signInCard.subtitle")}</p>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}
        <div>
          <label className="label" htmlFor="landing-identifier">{t("landing.signInCard.usernameLabel")}</label>
          <input id="landing-identifier" className="input-field" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder={t("landing.signInCard.usernamePlaceholder")} required />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="landing-password">{t("landing.signInCard.passwordLabel")}</label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">{t("landing.signInCard.forgot")}</Link>
          </div>
          <input id="landing-password" type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("landing.signInCard.passwordPlaceholder")} required />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? t("landing.signInCard.submitting") : t("landing.signInCard.submit")}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-on-surface-variant">
        {t("landing.signInCard.noAccount")} <Link to="/register" className="text-primary hover:underline">{t("common.signUp")}</Link>
      </p>
      <div className="mt-4">
        <GoogleSignInButton />
      </div>
    </div>
  );
}

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
            <p className="font-mono text-2xl font-bold text-primary sm:text-3xl">{c.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-on-surface-variant">{c.label}</p>
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
        <div className="relative mx-auto grid max-w-container grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="badge mb-4 inline-flex items-center gap-2 bg-success/15 text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> {t("landing.badge")}
            </span>
            <h1 className="font-display text-3xl font-bold leading-tight text-on-surface sm:text-4xl md:text-5xl lg:text-6xl">
              {t("landing.heroTitle")}
            </h1>
            <p className="mt-4 max-w-lg text-base text-on-surface-variant">
              {t("landing.heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/services" className="btn-primary w-full sm:w-auto">{t("landing.viewServices")}</Link>
              <Link to="/api-docs" className="btn-ghost w-full border border-outline-variant sm:w-auto">{t("landing.apiDocumentation")}</Link>
            </div>

            <div className="relative mt-10 max-w-md">
              <input
                className="input-field"
                placeholder={t("landing.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {filtered.length > 0 && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-md border border-outline-variant bg-surface-container shadow-xl">
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

          <div className="flex justify-center lg:justify-end">
            <SignInCard />
          </div>
        </div>
      </section>

      <StatsBar startingPrice={startingPrice} />

      <section className="mx-auto max-w-container px-4 py-16 sm:px-6">
        <h2 className="text-center font-display text-2xl font-bold text-on-surface sm:text-3xl">{t("landing.whyHeading")}</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["delivery", "pricing", "api", "support"] as const).map((key) => (
            <div key={key} className="card">
              <p className="font-semibold text-on-surface">{t(`landing.features.${key}.title`)}</p>
              <p className="mt-1 text-sm text-on-surface-variant">{t(`landing.features.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      {platforms.length > 0 && (
        <section className="border-t border-outline-variant/60 bg-surface-container/20 py-10">
          <div className="mx-auto max-w-container px-4 text-center sm:px-6">
            <p className="text-xs uppercase tracking-widest text-on-surface-variant">{t("landing.platformsHeading")}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {platforms.map((p) => (
                <span key={p} className="badge bg-surface-container-high text-on-surface-variant">{p}</span>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
