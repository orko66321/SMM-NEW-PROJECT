import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "../api/resources.js";
import { useLanguage } from "../context/LanguageContext.js";

/**
 * Subtle "How to order?" tutorial link, shown at the bottom of order/product
 * pages. Self-contained: reads `howToOrderVideoUrl` from the public settings
 * (same cached query key as every other site-wide setting, so toggling it in
 * Admin propagates without a redeploy) and the current locale for the label.
 *
 * Renders nothing at all when the admin hasn't set a URL — no empty row or
 * placeholder is left behind.
 */
export default function HowToOrderLink({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 60_000 });

  const url = (settings?.howToOrderVideoUrl ?? "").trim();
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-sm text-on-surface-variant transition hover:text-primary ${className}`}
    >
      {/* external-link icon */}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
      <span>{t("common.howToOrder")}</span>
      {/* right-arrow icon */}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </a>
  );
}
