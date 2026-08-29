import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext.js";
import { useCurrency } from "../../context/CurrencyContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { getWallet } from "../../api/resources.js";
import NoticeBar from "./NoticeBar.js";
import CurrencySwitcher from "./CurrencySwitcher.js";
import LanguageSwitcher from "./LanguageSwitcher.js";
import { Logo } from "../Logo.js";
import { Icon, type IconName } from "../ds/Icon.js";
import { cn } from "../ds/cn.js";

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: getWallet,
    refetchInterval: 30_000,
    enabled: !!user,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems: { to: string; label: string; end?: boolean; icon: IconName }[] = [
    { to: "/dashboard", label: t("dashboardLayout.nav.overview"), end: true, icon: "dashboard" },
    { to: "/dashboard/store", label: t("dashboardLayout.nav.store"), icon: "store" },
    { to: "/dashboard/leaderboard", label: t("dashboardLayout.nav.leaderboard"), icon: "leaderboard" },
    { to: "/dashboard/new-order", label: t("dashboardLayout.nav.newOrder"), icon: "cart" },
    { to: "/dashboard/orders", label: t("dashboardLayout.nav.ordersHistory"), icon: "orders" },
    { to: "/dashboard/services", label: t("dashboardLayout.nav.services"), icon: "grid" },
    { to: "/dashboard/wallet", label: t("dashboardLayout.nav.addFunds"), icon: "wallet" },
    { to: "/dashboard/tickets", label: t("dashboardLayout.nav.tickets"), icon: "support" },
    { to: "/dashboard/profile", label: t("dashboardLayout.nav.profile"), icon: "user" },
    { to: "/docs", label: t("dashboardLayout.nav.docs"), icon: "docs" },
  ];

  const bottomNavItems: { to: string; label: string; end?: boolean; icon: IconName }[] = [
    { to: "/dashboard", label: t("dashboardLayout.bottomNav.home"), end: true, icon: "dashboard" },
    { to: "/dashboard/new-order", label: t("dashboardLayout.bottomNav.order"), icon: "cart" },
    { to: "/dashboard/services", label: t("dashboardLayout.bottomNav.services"), icon: "grid" },
    { to: "/dashboard/wallet", label: t("dashboardLayout.bottomNav.wallet"), icon: "wallet" },
    { to: "/dashboard/tickets", label: t("dashboardLayout.bottomNav.support"), icon: "support" },
  ];

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex min-h-[44px] items-center gap-3 rounded-control border-r-[3px] px-3 py-2.5 text-sm transition duration-200 ease-ds",
      isActive
        ? "border-primary-hover bg-primary/15 font-semibold text-accent-on-dark"
        : "border-transparent font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
    );

  function NavItems({ items }: { items: typeof navItems }) {
    return (
      <>
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
            {({ isActive }) => (
              <>
                <Icon name={item.icon} size={20} filled={isActive} className="shrink-0" />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </>
    );
  }

  const walletChip = (
    <div className="rounded-control border border-outline-variant bg-surface-container-high px-2.5 py-1.5 font-mono text-xs text-success sm:px-3 sm:text-sm">
      {formatCurrency(wallet?.balance ?? 0)}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-outline-variant bg-surface-card md:block">
        <div className="flex h-16 items-center px-6">
          <Logo />
        </div>
        <nav className="aio-scroll flex flex-col gap-0.5 px-3">
          <NavItems items={navItems} />
        </nav>
      </aside>

      {/* Mobile off-canvas drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${drawerOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!drawerOpen}
      >
        <div
          className={`absolute inset-0 bg-surface-deep/70 backdrop-blur-[12px] transition-opacity duration-300 ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={`glass absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col shadow-overlay transition-transform duration-300 ease-out ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant px-4">
            <Logo />
            <button
              type="button"
              aria-label={t("nav.closeMenu")}
              onClick={() => setDrawerOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-control text-on-surface-variant hover:bg-surface-container-high"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 border-b border-outline-variant px-4 py-3">
            <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
              {user?.avatarUrl && (
                <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
              )}
              {user ? `@${user.username}` : t("dashboardLayout.guestLabel")}
            </div>
            {user && walletChip}
          </div>
          <nav className="aio-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
            <NavItems items={navItems} />
          </nav>
          <div className="flex items-center justify-between gap-2 border-t border-outline-variant px-4 py-3">
            <LanguageSwitcher />
            <CurrencySwitcher />
          </div>
          <div className="border-t border-outline-variant p-3">
            {user ? (
              <button type="button" onClick={handleLogout} className="btn-ghost min-h-[44px] w-full justify-center text-sm">
                {t("dashboardLayout.logout")}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <NavLink to="/login" state={{ from: location }} className="btn-primary min-h-[44px] w-full justify-center text-sm">
                  {t("common.signIn")}
                </NavLink>
                <NavLink to="/register" state={{ from: location }} className="btn-ghost min-h-[44px] w-full justify-center text-sm">
                  {t("common.signUp")}
                </NavLink>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* min-w-0 overrides the flex item's default min-width:auto — without
          it, any wide descendant (e.g. a non-wrapping row of filter pills)
          forces this whole column wider than the viewport instead of
          scrolling internally, blowing out the page horizontally on mobile. */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-outline-variant bg-surface-card/80 px-3 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label={t("nav.openMenu")}
              onClick={() => setDrawerOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-on-surface hover:bg-surface-container-high md:hidden"
            >
              <Icon name="menu" size={22} />
            </button>
            <div className="hidden items-center gap-2 truncate font-mono text-sm text-on-surface-variant sm:flex">
              {user?.avatarUrl && (
                <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
              )}
              {user ? `@${user.username}` : t("dashboardLayout.guestLabel")}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <LanguageSwitcher />
              <CurrencySwitcher />
            </div>
            {user ? (
              <>
                {walletChip}
                <button className="btn-ghost hidden !px-3 !py-1.5 text-xs sm:inline-flex" onClick={handleLogout}>
                  {t("dashboardLayout.logout")}
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" state={{ from: location }} className="btn-ghost hidden !px-3 !py-1.5 text-xs sm:inline-flex">
                  {t("common.signIn")}
                </NavLink>
                <NavLink to="/register" state={{ from: location }} className="btn-primary hidden !px-3 !py-1.5 text-xs sm:inline-flex">
                  {t("common.signUp")}
                </NavLink>
              </>
            )}
          </div>
        </header>
        <NoticeBar />
        <main className="flex-1 p-4 pb-24 sm:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-outline-variant md:hidden">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition",
                isActive ? "text-accent-on-dark" : "text-on-surface-variant",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} size={22} filled={isActive} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
