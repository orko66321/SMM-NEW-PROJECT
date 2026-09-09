import { useEffect, useState } from "react";
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import CurrencySwitcher from "./CurrencySwitcher.js";
import LanguageSwitcher from "./LanguageSwitcher.js";
import NoticeBar from "./NoticeBar.js";
import NavMoreMenu from "./NavMoreMenu.js";
import { MORE_GROUPS } from "./moreLinks.js";
import { Logo } from "../Logo.js";
import { Icon } from "../ds/Icon.js";

export default function PublicLayout() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { to: "/", label: t("nav.home"), end: true },
    { to: "/services", label: t("nav.services") },
    { to: "/api-docs", label: t("nav.api") },
    { to: "/docs", label: t("nav.docs") },
  ];

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-outline-variant/60 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-container items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <NavMoreMenu />
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-3 lg:flex">
              <LanguageSwitcher />
              <CurrencySwitcher />
            </div>
            {user ? (
              <Link
                to={user.role === "ADMIN" ? "/admin" : "/dashboard"}
                className="btn-primary hidden !px-4 !py-1.5 text-sm lg:inline-flex"
              >
                {t("nav.dashboard")}
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost hidden !px-3 !py-1.5 text-sm lg:inline-flex">{t("nav.signIn")}</Link>
                <Link to="/register" className="btn-primary hidden !px-4 !py-1.5 text-sm lg:inline-flex">{t("nav.signUp")}</Link>
              </>
            )}
            <button
              type="button"
              aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-control text-on-surface hover:bg-surface-container-high lg:hidden"
            >
              <Icon name={menuOpen ? "close" : "menu"} size={menuOpen ? 20 : 22} />
            </button>
          </div>
        </div>
        <NoticeBar />

        {/* Mobile menu panel */}
        <div
          className={`grid overflow-hidden border-t border-outline-variant/60 bg-surface transition-[grid-template-rows] duration-300 ease-out lg:hidden ${
            menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0">
            <nav className="flex max-h-[calc(100dvh-4rem)] flex-col gap-1 overflow-y-auto px-4 py-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex min-h-[44px] items-center rounded-md px-3 text-sm font-medium transition ${
                      isActive ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:bg-surface-container-high"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              {/* "More" — collapsible groups, mirrors the desktop mega-menu */}
              {MORE_GROUPS.map((group) => (
                <details key={group.titleKey} className="group rounded-md">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between rounded-md px-3 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container-high marker:content-none">
                    {t(group.titleKey)}
                    <Icon
                      name="chevron-down"
                      size={16}
                      className="transition-transform duration-200 group-open:rotate-180"
                    />
                  </summary>
                  <div className="mb-1 mt-0.5 flex flex-col gap-0.5 pl-2">
                    {group.links.map((l) => (
                      <Link
                        key={l.to}
                        to={l.to}
                        className="flex min-h-[40px] items-center gap-2.5 rounded-md px-3 text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
                      >
                        <Icon name={l.icon} size={15} className="shrink-0 text-on-surface-variant/60" />
                        <span className="flex-1">{t(l.labelKey)}</span>
                        {l.guestPrompt && (
                          <span className="text-[10px] font-medium uppercase tracking-wide text-on-surface-variant/50">
                            {t("nav.moreItems.needsAccount")}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </details>
              ))}

              <div className="my-2 border-t border-outline-variant/60" />
              <div className="flex items-center justify-between px-1 py-2">
                <span className="text-xs text-on-surface-variant">{t("nav.language")}</span>
                <LanguageSwitcher />
              </div>
              <div className="flex items-center justify-between px-1 py-2">
                <span className="text-xs text-on-surface-variant">{t("nav.currency")}</span>
                <CurrencySwitcher />
              </div>
              {user ? (
                <Link to={user.role === "ADMIN" ? "/admin" : "/dashboard"} className="btn-primary min-h-[44px] w-full justify-center text-sm">
                  {t("nav.dashboard")}
                </Link>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link to="/login" className="btn-ghost min-h-[44px] w-full justify-center text-sm">{t("nav.signIn")}</Link>
                  <Link to="/register" className="btn-primary min-h-[44px] w-full justify-center text-sm">{t("nav.signUp")}</Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* min-w-0: a flex child won't shrink below its content's intrinsic
          width by default, so a wide element anywhere in a page (e.g. the
          landing dashboard-preview card) would force horizontal scroll on
          mobile. Same fix as DashboardLayout / AdminLayout. */}
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-outline-variant/60 bg-surface-container/40">
        <div className="mx-auto max-w-container px-4 py-10 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <Logo />
              <p className="mt-3 max-w-xs text-xs leading-relaxed text-on-surface-variant">
                {t("footer.tagline")}
              </p>
            </div>
            {MORE_GROUPS.map((group) => (
              <div key={group.titleKey}>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                  {t(group.titleKey)}
                </p>
                <ul className="mt-3 space-y-2">
                  {group.links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className="text-sm text-on-surface-variant transition hover:text-on-surface">
                        {t(l.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                {t("footer.getStarted")}
              </p>
              <ul className="mt-3 space-y-2">
                <li><Link to="/services" className="text-sm text-on-surface-variant transition hover:text-on-surface">{t("nav.services")}</Link></li>
                <li><Link to="/api-docs" className="text-sm text-on-surface-variant transition hover:text-on-surface">{t("nav.apiDocs")}</Link></li>
                <li><Link to="/register" className="text-sm text-on-surface-variant transition hover:text-on-surface">{t("nav.signUp")}</Link></li>
                <li><Link to="/login" className="text-sm text-on-surface-variant transition hover:text-on-surface">{t("nav.signIn")}</Link></li>
              </ul>
            </div>
          </div>
          <p className="mt-8 border-t border-outline-variant/60 pt-6 text-xs text-on-surface-variant">
            {t("footer.rights", { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
}
