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

// TODO(footer): swap these for the real values before launch.
const SUPPORT_EMAIL = "support@example.com";
const WHATSAPP_DISPLAY = "+880 1XXX-XXXXXX";
const WHATSAPP_LINK = "https://wa.me/8801XXXXXXXXX";
const SOCIAL_LINKS = {
  facebook: "https://facebook.com/TODO",
  telegram: "https://t.me/TODO",
  whatsapp: WHATSAPP_LINK,
  x: "https://x.com/TODO",
};

type SocialName = "facebook" | "telegram" | "whatsapp" | "x";

// Solid brand glyphs — the shared stroke-based <Icon> set doesn't cover
// logos, so these small filled marks live here instead.
function SocialGlyph({ name }: { name: SocialName }) {
  const paths: Record<SocialName, string> = {
    facebook:
      "M22 12a10 10 0 1 0-11.5 9.9v-7H7.9V12h2.6V9.8c0-2.6 1.5-4 3.9-4 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.9l-.5 2.9h-2.4v7A10 10 0 0 0 22 12Z",
    telegram:
      "M21.9 4.7 18.6 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.3-.1-.5-.6-.2L6.3 13 1.4 11.5c-1.1-.3-1.1-1.1.2-1.6l19.2-7.4c.9-.3 1.7.2 1.1 2.2Z",
    whatsapp:
      "M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.2-3.7-.8-3.1-1.2-5.1-4.3-5.3-4.5-.2-.2-1.3-1.7-1.3-3.2 0-1.5.8-2.3 1.1-2.6.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5.2.5.8 1.9.8 2 .1.2.1.3 0 .5-.1.2-.1.3-.3.5l-.5.5c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1l1.8.9c.2.1.4.2.5.3.1.2.1.9-.1 1.6Z",
    x: "M18.9 2H22l-7.2 8.2L23 22h-6.6l-5.2-6.8L5.2 22H2l7.7-8.8L1 2h6.8l4.7 6.2L18.9 2Zm-1.2 18.2h1.8L7.4 3.7H5.5l12.2 16.5Z",
  };
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

const PAYMENT_BADGES: { label: string; colorClass: string }[] = [
  { label: "bKash", colorClass: "text-bkash" },
  { label: "Nagad", colorClass: "text-nagad" },
  { label: "Rocket", colorClass: "text-rocket" },
  { label: "Visa", colorClass: "text-blue-400" },
  { label: "Mastercard", colorClass: "text-amber-500" },
];

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
        <div className="mx-auto max-w-container px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {/* Column 1: brand & contact */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Logo />
              <p className="mt-3 max-w-xs text-xs leading-relaxed text-on-surface-variant">
                {t("footer.tagline")}
              </p>
              <ul className="mt-5 space-y-2.5 text-sm">
                <li>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="flex items-center gap-2 text-on-surface-variant transition hover:text-on-surface"
                  >
                    <Icon name="send" size={15} className="shrink-0 text-on-surface-variant/60" />
                    {SUPPORT_EMAIL}
                  </a>
                </li>
                <li>
                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-on-surface-variant transition hover:text-on-surface"
                  >
                    <SocialGlyph name="whatsapp" />
                    {WHATSAPP_DISPLAY}
                  </a>
                </li>
                <li className="flex items-center gap-2 text-on-surface-variant/80">
                  <Icon name="check-circle" size={15} className="shrink-0 text-on-surface-variant/60" />
                  {t("footer.supportHours")}
                </li>
              </ul>
            </div>

            {/* Column 2: quick navigation — public destinations only */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                {t("footer.groups.quickNav")}
              </p>
              <ul className="mt-3 space-y-2">
                <li><Link to="/" className="text-sm text-on-surface-variant transition hover:text-on-surface">{t("footer.nav.home")}</Link></li>
                <li><Link to="/services" className="text-sm text-on-surface-variant transition hover:text-on-surface">{t("footer.nav.services")}</Link></li>
                <li><Link to="/services" className="text-sm text-on-surface-variant transition hover:text-on-surface">{t("footer.nav.offers")}</Link></li>
                <li><Link to="/about" className="text-sm text-on-surface-variant transition hover:text-on-surface">{t("footer.nav.about")}</Link></li>
                <li><Link to="/contact" className="text-sm text-on-surface-variant transition hover:text-on-surface">{t("footer.nav.contact")}</Link></li>
                <li>
                  <Link
                    to={user ? (user.role === "ADMIN" ? "/admin" : "/dashboard") : "/dashboard"}
                    className="text-sm text-on-surface-variant transition hover:text-on-surface"
                  >
                    {t("footer.nav.dashboard")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: support & policy */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                {t("footer.groups.supportPolicy")}
              </p>
              <ul className="mt-3 space-y-2">
                <li><Link to="/terms" className="text-sm text-on-surface-variant transition hover:text-on-surface">{t("footer.policy.terms")}</Link></li>
                <li><Link to="/privacy" className="text-sm text-on-surface-variant transition hover:text-on-surface">{t("footer.policy.privacy")}</Link></li>
                <li><Link to="/terms" className="text-sm text-on-surface-variant transition hover:text-on-surface">{t("footer.policy.refund")}</Link></li>
                <li><Link to="/faq" className="text-sm text-on-surface-variant transition hover:text-on-surface">{t("footer.policy.faq")}</Link></li>
                <li><Link to="/contact" className="text-sm text-on-surface-variant transition hover:text-on-surface">{t("footer.policy.support")}</Link></li>
              </ul>
            </div>

            {/* Column 4: trust & community */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                {t("footer.groups.community")}
              </p>
              <div className="mt-3 flex items-center gap-2">
                {(Object.keys(SOCIAL_LINKS) as (keyof typeof SOCIAL_LINKS)[]).map((name) => (
                  <a
                    key={name}
                    href={SOCIAL_LINKS[name]}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t(`footer.social.${name}`)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-high/40 text-on-surface-variant transition hover:border-primary/50 hover:text-primary"
                  >
                    <SocialGlyph name={name} />
                  </a>
                ))}
              </div>
              <a
                href={SOCIAL_LINKS.telegram}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-on-surface-variant transition hover:text-primary"
              >
                <SocialGlyph name="telegram" />
                {t("footer.social.joinTelegram")}
              </a>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                {t("footer.weAccept")}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {PAYMENT_BADGES.map((m) => (
                  <span
                    key={m.label}
                    className="rounded-full border border-outline-variant/60 bg-surface-container-high/40 px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant"
                  >
                    <span className={m.colorClass}>{m.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-outline-variant/60 pt-6">
            <p className="text-xs text-on-surface-variant">
              {t("footer.rights", { year: new Date().getFullYear() })}
            </p>
            <p className="mt-1.5 max-w-2xl text-[11px] leading-relaxed text-on-surface-variant/70">
              {t("footer.disclaimer")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
