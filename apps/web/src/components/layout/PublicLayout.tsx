import { useEffect, useState } from "react";
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import CurrencySwitcher from "./CurrencySwitcher.js";
import LanguageSwitcher from "./LanguageSwitcher.js";
import NoticeBar from "./NoticeBar.js";
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
          <nav className="hidden items-center gap-1 md:flex">
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
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <LanguageSwitcher />
              <CurrencySwitcher />
            </div>
            {user ? (
              <Link
                to={user.role === "ADMIN" ? "/admin" : "/dashboard"}
                className="btn-primary hidden !px-4 !py-1.5 text-sm sm:inline-flex"
              >
                {t("nav.dashboard")}
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost hidden !px-3 !py-1.5 text-sm sm:inline-flex">{t("nav.signIn")}</Link>
                <Link to="/register" className="btn-primary hidden !px-4 !py-1.5 text-sm sm:inline-flex">{t("nav.signUp")}</Link>
              </>
            )}
            <button
              type="button"
              aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-control text-on-surface hover:bg-surface-container-high md:hidden"
            >
              <Icon name={menuOpen ? "close" : "menu"} size={menuOpen ? 20 : 22} />
            </button>
          </div>
        </div>
        <NoticeBar />

        {/* Mobile menu panel */}
        <div
          className={`grid overflow-hidden border-t border-outline-variant/60 bg-surface transition-[grid-template-rows] duration-300 ease-out md:hidden ${
            menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0">
            <nav className="flex flex-col gap-1 px-4 py-3">
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

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-outline-variant/60 bg-surface-container/40">
        <div className="mx-auto max-w-container px-4 py-8 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <Logo />
              <p className="mt-2 text-xs text-on-surface-variant">
                {t("footer.rights", { year: new Date().getFullYear() })}
              </p>
            </div>
            <div className="flex gap-5 text-sm text-on-surface-variant">
              <Link to="/services" className="hover:text-on-surface">{t("nav.services")}</Link>
              <Link to="/api-docs" className="hover:text-on-surface">{t("nav.apiDocs")}</Link>
              <Link to="/docs" className="hover:text-on-surface">{t("nav.docs")}</Link>
              <Link to="/login" className="hover:text-on-surface">{t("nav.signIn")}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
