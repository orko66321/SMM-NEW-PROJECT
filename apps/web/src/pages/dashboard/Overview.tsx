import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getMyOrders, getPublicStats, getStoreBrands, getWallet } from "../../api/resources.js";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { pickLang } from "../../i18n/pickLang.js";
import BannerSlider from "../../components/ui/BannerSlider.js";
import { LeaderboardSection } from "../../components/leaderboard/LeaderboardSection.js";
import { EmptyState, StatCard, StatusBadge } from "../../components/ds/index.js";
import { useCurrency } from "../../context/CurrencyContext.js";

const PINNED_BRAND_LIMIT = 6;

function StoreSection() {
  const { t } = useLanguage();
  const { data: brands } = useQuery({ queryKey: ["store-brands", PINNED_BRAND_LIMIT], queryFn: () => getStoreBrands(PINNED_BRAND_LIMIT) });

  if (brands && brands.length === 0) return null;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-on-surface-variant">{t("overview.storeSectionTitle")}</h2>
        <Link to="/dashboard/store" className="text-xs text-primary hover:underline">{t("overview.seeAll")}</Link>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {brands?.map((b: { id: string; name: string; logo: string | null }) => (
          <Link key={b.id} to="/dashboard/store" className="flex flex-col items-center gap-1.5 rounded-lg border border-outline-variant p-3 text-center transition hover:border-primary/60">
            {b.logo ? (
              <img src={b.logo} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-sm font-bold text-primary">{b.name.slice(0, 1)}</div>
            )}
            <span className="truncate text-xs font-medium text-on-surface">{b.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Guest-facing variant of the Overview landing view — no wallet/order
// queries (those 401 for a logged-out session), just generic platform
// content and a clear path to browsing or creating an account. This is
// what a logged-out visitor sees by default at /dashboard (see App.tsx —
// the route carries no auth guard any more).
function GuestOverview() {
  const { t } = useLanguage();
  const { data: stats } = useQuery({ queryKey: ["public-stats"], queryFn: getPublicStats });

  const statCards = [
    { label: t("landing.stats.registeredUsers"), value: stats ? stats.totalUsers.toLocaleString() : "—" },
    { label: t("landing.stats.ordersCompleted"), value: stats ? stats.totalOrdersCompleted.toLocaleString() : "—" },
  ];

  return (
    <div className="space-y-6">
      <BannerSlider />

      <div className="card space-y-4 text-center">
        <h1 className="text-xl font-bold sm:text-2xl">{t("overview.guestWelcome")}</h1>
        <p className="mx-auto max-w-md text-sm text-on-surface-variant">{t("overview.guestSubtitle")}</p>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Link to="/register" className="btn-primary sm:min-w-[10rem]">{t("common.signUp")}</Link>
          <Link to="/login" className="btn-ghost border border-outline-variant sm:min-w-[10rem]">{t("common.signIn")}</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {statCards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} />
        ))}
      </div>

      <StoreSection />

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-on-surface-variant">{t("overview.guestWhyHeading")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(["delivery", "pricing", "api", "support"] as const).map((key) => (
            <div key={key}>
              <p className="text-sm font-semibold text-on-surface">{t(`landing.features.${key}.title`)}</p>
              <p className="mt-1 text-xs text-on-surface-variant">{t(`landing.features.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="font-semibold text-on-surface">{t("overview.guestBrowseTitle")}</p>
          <p className="text-sm text-on-surface-variant">{t("overview.guestBrowseBody")}</p>
        </div>
        <Link to="/dashboard/new-order" className="btn-primary shrink-0">{t("overview.newOrderCta")}</Link>
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
    <div className="space-y-6">
      <BannerSlider />

      <h1 className="text-xl font-bold sm:text-2xl">{t("overview.welcomeBack", { username: user.username })}</h1>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard
          accent
          label={t("overview.walletBalance")}
          value={formatCurrency(wallet?.balance ?? 0)}
          icon="wallet"
        />
        <StatCard label={t("overview.totalOrders")} value={orders?.total ?? 0} icon="orders" />
        <div className="card flex flex-col justify-between p-3 sm:p-5">
          <p className="label text-[10px] sm:text-xs">{t("overview.quickAction")}</p>
          <Link
            to="/dashboard/new-order"
            className="btn-primary mt-2 justify-center break-words px-2 py-1.5 text-center text-xs leading-tight sm:px-4 sm:py-2.5 sm:text-sm sm:leading-normal"
          >
            {t("overview.newOrderCta")}
          </Link>
        </div>
      </div>

      <StoreSection />

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-on-surface-variant">{t("overview.recentOrders")}</h2>
        {orders?.items.length ? (
          <ul className="divide-y divide-outline-variant">
            {orders.items.map((o: { id: string; service: { name: string; nameBn: string | null }; quantity: number; charge: string; status: string }) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-sm">
                <span className="min-w-0 flex-1 basis-full truncate sm:basis-auto">{pickLang(lang, o.service.nameBn, o.service.name)}</span>
                <span className="font-mono text-on-surface-variant">{o.quantity}</span>
                <span className="font-mono">${o.charge}</span>
                <StatusBadge status={o.status} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="orders" title={t("overview.noOrdersYet")} />
        )}
      </div>

      <LeaderboardSection currentUserId={user.id} isAdmin={user.role === "ADMIN" || user.role === "MODERATOR"} />
    </div>
  );
}
