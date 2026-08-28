import type { Lang } from "./translations.js";

/**
 * Pick the language-appropriate value for a piece of dynamic (DB-stored)
 * content that has an English field and an optional Bengali override —
 * service names/descriptions, post titles/bodies, etc. Falls back to the
 * other language rather than rendering blank when the preferred one is
 * empty (same convention as dashboard/NewOrder.tsx's notice handling).
 */
export function pickLang(
  lang: Lang,
  bn: string | null | undefined,
  en: string | null | undefined,
): string {
  const b = bn?.trim();
  const e = en?.trim();
  if (lang === "bn") return b || e || "";
  return e || b || "";
}
