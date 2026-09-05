// Human-readable formatting for a service's cached "Average Time"
// (Order.completionSeconds → Service.avgCompletionSeconds). Mirrors how the
// competitor panel phrases it: "less than a minute", "23 minutes", "2 hours".
//
// Takes the caller's `t` so both languages (and the singular/plural split,
// which the i18n layer does by key, not grammar) stay in translations.ts.

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** `seconds` null/≤0 ⇒ the caller decides what to render — this returns null. */
export function formatDuration(t: Translate, seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;

  if (seconds < MINUTE) return t("completionTime.lessThanMinute");

  if (seconds < 90 * MINUTE) {
    const n = Math.max(1, Math.round(seconds / MINUTE));
    return t(n === 1 ? "completionTime.minuteOne" : "completionTime.minutes", { count: n });
  }

  if (seconds < 2 * DAY) {
    const n = Math.max(1, Math.round(seconds / HOUR));
    return t(n === 1 ? "completionTime.hourOne" : "completionTime.hours", { count: n });
  }

  const n = Math.max(1, Math.round(seconds / DAY));
  return t(n === 1 ? "completionTime.dayOne" : "completionTime.days", { count: n });
}

/**
 * Whether a service's newest completion is fresh enough to show the
 * "Recently Completed" badge. `windowHours` comes from
 * PublicSettings.recentlyCompletedWindowHours (admin-configurable).
 */
export function isRecentlyCompleted(
  lastCompletedAt: string | null | undefined,
  windowHours: number | null | undefined,
): boolean {
  if (!lastCompletedAt || !windowHours || windowHours <= 0) return false;
  const last = new Date(lastCompletedAt).getTime();
  if (Number.isNaN(last)) return false;
  return Date.now() - last <= windowHours * HOUR * 1000;
}
