import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext.js";
import { Icon } from "../ds/Icon.js";
import { MORE_GROUPS, MORE_LINKS } from "./moreLinks.js";

// Desktop "More" mega-menu. Opens on hover and on click; closes on outside
// click, Escape, or route change. The mobile drawer renders its own
// collapsible version (PublicLayout.tsx) — this component is lg-only.
export default function NavMoreMenu() {
  const { t } = useLanguage();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const openNow = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  const routeActive = MORE_LINKS.some((l) => {
    const path = l.to.split("?")[0] ?? l.to;
    return path === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(path);
  });

  return (
    <div ref={wrapRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition ${
          open || routeActive ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
        }`}
      >
        {t("nav.more")}
        <Icon
          name="chevron-down"
          size={14}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        role="menu"
        aria-label={t("nav.more")}
        className={`absolute right-0 top-full z-40 mt-2 w-[34rem] origin-top-right rounded-control border border-outline-variant bg-surface-card p-2 shadow-overlay transition duration-150 ease-ds ${
          open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1 opacity-0"
        }`}
      >
        <div className="grid grid-cols-2 gap-1">
          {MORE_GROUPS.map((group) => (
            <div key={group.titleKey}>
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
                {t(group.titleKey)}
              </p>
              <ul>
                {group.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      role="menuitem"
                      tabIndex={open ? 0 : -1}
                      className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:bg-surface-container-high focus-visible:text-on-surface focus-visible:outline-none"
                    >
                      <Icon name={l.icon} size={16} className="shrink-0 text-on-surface-variant/60" />
                      <span className="flex-1">{t(l.labelKey)}</span>
                      {l.guestPrompt && (
                        <span className="text-[10px] font-medium uppercase tracking-wide text-on-surface-variant/50">
                          {t("nav.moreItems.needsAccount")}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-1 border-t border-outline-variant/60 px-3 pb-1 pt-2 text-xs text-on-surface-variant">
          {t("nav.moreFootnote")}
        </p>
      </div>
    </div>
  );
}
