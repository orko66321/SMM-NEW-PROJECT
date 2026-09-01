import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext.js";

// Social-platform quick links for the Overview page. Each opens the New
// Order form pre-filtered to that platform (`?platform=<slug>` — matched
// against ServiceCategory.platform in NewOrder's usePlatformFilter).
//
// Icons are single-path brand marks (simple-icons style) kept inline —
// same approach as components/support/HelpWidget's GLYPHS, no extra
// dependency. `label` is the accessible name only; the tile shows just the
// mark. `slug` is compared case-insensitively to the category's `platform`
// string, so it must match the values the catalog actually uses
// (e.g. "twitter" — categories are platform "Twitter", not "X").
interface PlatformShortcut {
  slug: string;
  label: string;
  brand: string;
  path: string;
}

const PLATFORMS: PlatformShortcut[] = [
  {
    slug: "instagram",
    label: "Instagram",
    brand: "#E4405F",
    path: "M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.64.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.64-.07-4.85s.01-3.58.07-4.85C2.4 3.94 3.92 2.4 7.15 2.24 8.42 2.18 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z",
  },
  {
    slug: "tiktok",
    label: "TikTok",
    brand: "#000000",
    path: "M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  },
  {
    slug: "youtube",
    label: "YouTube",
    brand: "#FF0000",
    path: "M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.87.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z",
  },
  {
    slug: "facebook",
    label: "Facebook",
    brand: "#1877F2",
    path: "M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 9.1 24v-8.44H6.36v-3.49H9.1V9.36c0-2.72 1.6-4.22 4.06-4.22 1.18 0 2.4.21 2.4.21v2.66h-1.35c-1.34 0-1.75.83-1.75 1.68v2.02h2.98l-.48 3.49h-2.5V24C19.61 23.1 24 18.1 24 12.07z",
  },
  {
    slug: "telegram",
    label: "Telegram",
    brand: "#26A5E4",
    path: "M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.24-.42.43-.83.42z",
  },
  {
    slug: "twitter",
    label: "X (Twitter)",
    brand: "#000000",
    path: "M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z",
  },
  {
    slug: "whatsapp",
    label: "WhatsApp",
    brand: "#25D366",
    path: "M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7C17.17 3.03 14.68 2 12.04 2zm5.52 11.94c-.25.7-1.45 1.36-2 1.42-.53.06-1.03.28-3.47-.72-2.93-1.18-4.79-4.16-4.94-4.36-.14-.2-1.18-1.57-1.18-3s.75-2.12 1.02-2.41c.27-.29.58-.36.78-.36l.56.01c.18.01.42-.07.66.5.25.6.84 2.07.91 2.22.07.15.12.32.02.52-.1.2-.15.32-.29.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.35 1.45.29.15.46.12.63-.07.17-.2.73-.85.93-1.14.2-.29.39-.24.66-.14.27.1 1.71.81 2 .95.29.15.49.22.56.34.07.12.07.7-.18 1.4z",
  },
  {
    slug: "spotify",
    label: "Spotify",
    brand: "#1DB954",
    path: "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z",
  },
];

export function PlatformShortcuts() {
  const { t } = useLanguage();

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-on-surface-variant">{t("overview.platformSectionTitle")}</h2>
        <Link to="/dashboard/new-order" className="text-xs text-primary hover:underline">{t("overview.seeAll")}</Link>
      </div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
        {PLATFORMS.map(({ slug, label, brand, path }) => {
          // Near-black marks (TikTok, X) would vanish on the dark surface —
          // let them inherit the theme foreground instead of a fixed hex.
          const isDarkMark = brand === "#000000";
          return (
            <Link
              key={slug}
              to={`/dashboard/new-order?platform=${slug}`}
              aria-label={label}
              title={label}
              className={`flex aspect-square items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high transition hover:border-primary/60 hover:bg-surface-container-highest ${isDarkMark ? "text-on-surface" : ""}`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-6 w-6" style={isDarkMark ? undefined : { color: brand }}>
                <path d={path} />
              </svg>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
