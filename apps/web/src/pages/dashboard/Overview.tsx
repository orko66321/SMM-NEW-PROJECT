import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getMyOrders, getPublicStats, getStoreBrands, getWallet } from "../../api/resources.js";
import { useAuth } from "../../context/AuthContext.js";
import { useCurrency } from "../../context/CurrencyContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { pickLang } from "../../i18n/pickLang.js";
import BannerSlider from "../../components/ui/BannerSlider.js";
import { LeaderboardSection } from "../../components/leaderboard/LeaderboardSection.js";
import { PlatformShortcuts } from "../../components/dashboard/PlatformShortcuts.js";
import { EmptyState, Icon, StatusBadge, type IconName } from "../../components/ds/index.js";
import "../../styles/panel-glass.css";

const PINNED_BRAND_LIMIT = 6;

// Section wrapper — frosted card on the violet ground.
function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`no-glass rounded-2xl border border-[#2b2b36] p-5 ${className}`}>{children}</div>;
}

function SectionHead({ title, to, cta }: { title: string; to?: string; cta?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-headline text-[14px] font-semibold text-[#f4f2fb]">
        <span className="h-1.5 w-1.5 rounded-[2px] bg-[#5de6ff] shadow-[0_0_8px_#5de6ff]" />
        {title}
      </h2>
      {to && cta && (
        <Link to={to} className="text-xs font-semibold text-[#d2bbff] transition hover:text-[#ede0ff]">
          {cta}
        </Link>
      )}
    </div>
  );
}

// Glass metric tile. `accent` gets the cyan-tinted balance treatment.
function GlassStat({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon?: IconName;
  accent?: boolean;
}) {
  return (
    <div
      className="no-glass rounded-2xl border p-4 sm:p-5"
      style={
        accent
          ? {
              borderColor: "rgba(93,230,255,0.28)",
              background:
                "radial-gradient(120% 130% at 100% 0%, rgba(93,230,255,0.12), transparent 55%), rgba(27,27,37,0.72)",
            }
          : { borderColor: "#2b2b36" }
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b8598] sm:text-[11px]">{label}</span>
        {icon && <Icon name={icon} size={18} className="text-[#d2bbff]" />}
      </div>
      <div className="mt-2 font-headline text-xl font-bold tracking-tight text-[#f4f2fb] sm:text-[30px] sm:leading-none">
        {value}
      </div>
    </div>
  );
}

function StoreSection() {
  const { t } = useLanguage();
  const { data: brands } = useQuery({
    queryKey: ["store-brands", PINNED_BRAND_LIMIT],
    queryFn: () => getStoreBrands(PINNED_BRAND_LIMIT),
  });

  if (brands && brands.length === 0) return null;

  return (
    <Panel>
      <SectionHead title={t("overview.storeSectionTitle")} to="/dashboard/store" cta={t("overview.seeAll")} />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {brands?.map((b: { id: string; name: string; logo: string | null }) => (
          <Link
            key={b.id}
            to="/dashboard/store"
            className="flex flex-col items-center gap-2 rounded-xl border border-[#2b2b36] bg-[#1b1b25] p-3 text-center transition hover:-translate-y-0.5 hover:border-[#d2bbff]/50"
          >
            {b.logo ? (
              <img src={b.logo} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] text-sm font-bold text-white">
                {b.name.slice(0, 1)}
              </div>
            )}
            <span className="truncate text-xs font-medium text-[#f4f2fb]">{b.name}</span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function PageHeader({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d2bbff]">
        <span className="h-px w-5 bg-gradient-to-r from-[#d2bbff] to-transparent" />
        {kicker}
      </p>
      <h1 className="mt-2 font-headline text-2xl font-bold text-[#f4f2fb] sm:text-3xl">{title}</h1>
      {sub && <p className="mt-1.5 max-w-[54ch] text-sm text-[#c7c4d7]">{sub}</p>}
    </div>
  );
}

// Guest-facing variant of the Overview landing view — no wallet/order
// queries (those 401 for a logged-out session), just generic platform
// content and a clear path to browsing or creating an account.
function GuestOverview() {
  const { t, lang } = useLanguage();
  const { data: stats } = useQuery({ queryKey: ["public-stats"], queryFn: getPublicStats });

  const statCards = [
    { label: t("landing.stats.registeredUsers"), value: stats ? stats.totalUsers.toLocaleString() : "—", icon: "users" as IconName },
    { label: t("landing.stats.ordersCompleted"), value: stats ? stats.totalOrdersCompleted.toLocaleString() : "—", icon: "check-circle" as IconName },
  ];

  return (
    <div className="no-page" lang={lang}>
      <div className="mx-auto max-w-[1240px] min-w-0 space-y-6">
        <BannerSlider />

        <Panel className="text-center">
          <h1 className="font-headline text-xl font-bold text-[#f4f2fb] sm:text-2xl">{t("overview.guestWelcome")}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#c7c4d7]">{t("overview.guestSubtitle")}</p>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              to="/register"
              className="no-cta inline-flex min-h-[46px] items-center justify-center rounded-full px-6 font-headline text-sm font-semibold text-white sm:min-w-[10rem]"
            >
              {t("common.signUp")}
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#3a3a47] px-6 text-sm font-semibold text-[#f4f2fb] transition hover:border-[#d2bbff]/50 sm:min-w-[10rem]"
            >
              {t("common.signIn")}
            </Link>
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {statCards.map((c) => (
            <GlassStat key={c.label} label={c.label} value={c.value} icon={c.icon} />
          ))}
        </div>

        <PlatformShortcuts />
        <StoreSection />

        <Panel>
          <SectionHead title={t("overview.guestWhyHeading")} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(["delivery", "pricing", "api", "support"] as const).map((key) => (
              <div key={key}>
                <p className="text-sm font-semibold text-[#f4f2fb]">{t(`landing.features.${key}.title`)}</p>
                <p className="mt-1 text-xs text-[#8b8598]">{t(`landing.features.${key}.body`)}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-semibold text-[#f4f2fb]">{t("overview.guestBrowseTitle")}</p>
            <p className="text-sm text-[#c7c4d7]">{t("overview.guestBrowseBody")}</p>
          </div>
          <Link
            to="/dashboard/new-order"
            className="no-cta inline-flex min-h-[46px] shrink-0 items-center justify-center rounded-full px-6 font-headline text-sm font-semibold text-white"
          >
            {t("overview.newOrderCta")}
          </Link>
        </Panel>
      </div>
    </div>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: getWallet, enabled: !!user });
  const { data: orders } = useQuery({
    queryKey: ["orders", "recent"],
    queryFn: () => getMyOrders({ page: 1, pageSize: 5 }),
    enabled: !!user,
  });

  if (!user) return <GuestOverview />;

  return (
    <div className="no-page" lang={lang}>
      <div className="mx-auto max-w-[1240px] min-w-0 space-y-6">
        <BannerSlider />

        <PageHeader kicker={t("dashboardLayout.nav.overview")} title={t("overview.welcomeBack", { username: user.username })} />

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <GlassStat accent label={t("overview.walletBalance")} value={formatCurrency(wallet?.balance ?? 0)} icon="wallet" />
          <GlassStat label={t("overview.totalOrders")} value={orders?.total ?? 0} icon="orders" />
          <div
            className="no-glass flex flex-col justify-between rounded-2xl border border-[#2b2b36] p-3 sm:p-5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8b8598] sm:text-[11px]">
              {t("overview.quickAction")}
            </p>
            <Link
              to="/dashboard/new-order"
              className="no-cta mt-2 flex items-center justify-center break-words rounded-full px-2 py-2 text-center font-headline text-xs font-semibold leading-tight text-white sm:px-4 sm:py-2.5 sm:text-sm sm:leading-normal"
            >
              {t("overview.newOrderCta")}
            </Link>
          </div>
        </div>

        <PlatformShortcuts />
        <StoreSection />

        <Panel>
          <SectionHead title={t("overview.recentOrders")} to="/dashboard/orders" cta={t("overview.seeAll")} />
          {orders?.items.length ? (
            <ul className="divide-y divide-[#2b2b36]">
              {orders.items.map(
                (o: {
                  id: string;
                  service: { name: string; nameBn: string | null };
                  quantity: number;
                  charge: string;
                  status: string;
                }) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 text-sm">
                    <span className="min-w-0 flex-1 basis-full truncate text-[#f4f2fb] sm:basis-auto">
                      {pickLang(lang, o.service.nameBn, o.service.name)}
                    </span>
                    <span className="font-mono text-xs text-[#8b8598]">{o.quantity.toLocaleString()}</span>
                    <span className="font-mono text-xs text-[#c7c4d7]">{formatCurrency(o.charge)}</span>
                    <StatusBadge status={o.status} />
                  </li>
                ),
              )}
            </ul>
          ) : (
            <EmptyState icon="orders" title={t("overview.noOrdersYet")} />
          )}
        </Panel>

        <LeaderboardSection currentUserId={user.id} isAdmin={user.role === "ADMIN" || user.role === "MODERATOR"} />
      </div>
    </div>
  );
}
