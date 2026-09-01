import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

export interface CategoryLike {
  id: string;
  name: string;
  platform: string;
}

// Slugs used in `?platform=` (from the Overview PlatformShortcuts links)
// mapped to the `ServiceCategory.platform` value(s) the catalog actually
// stores. Anything not listed falls through to an exact case-insensitive
// match on the slug itself.
const PLATFORM_ALIASES: Record<string, string[]> = {
  twitter: ["twitter", "x"],
  x: ["twitter", "x"],
};

function platformMatches(categoryPlatform: string, slug: string): boolean {
  const cat = categoryPlatform.trim().toLowerCase();
  const wanted = PLATFORM_ALIASES[slug.toLowerCase()] ?? [slug.toLowerCase()];
  return wanted.includes(cat);
}

/**
 * Drives the `?platform=<slug>` deep-link on the New Order page:
 * - narrows the Category <select> to that platform's categories
 * - auto-selects the first one (once) so the Service list cascades
 * - exposes a chip label + clear action
 *
 * Filters on the real `ServiceCategory.platform` column (via the catalog
 * API), not by parsing option text — so it doesn't break if the option
 * label format changes.
 */
export function usePlatformFilter(
  categories: CategoryLike[] | undefined,
  categoryId: string,
  setCategoryId: (id: string) => void,
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const platform = searchParams.get("platform");
  const autoSelectedFor = useRef<string | null>(null);

  const matched = useMemo(
    () => (platform && categories ? categories.filter((c) => platformMatches(c.platform, platform)) : []),
    [categories, platform],
  );

  const isFiltered = !!platform && matched.length > 0;

  // Auto-pick the first category for this platform so the service dropdown
  // fills in — but only once per platform value, and never over a choice
  // the user (or a restored draft) already made.
  useEffect(() => {
    if (!platform || matched.length === 0) return;
    if (autoSelectedFor.current === platform) return;
    autoSelectedFor.current = platform;
    if (!categoryId || !matched.some((c) => c.id === categoryId)) {
      setCategoryId(matched[0]!.id);
    }
  }, [platform, matched, categoryId, setCategoryId]);

  function clearFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete("platform");
    setSearchParams(next, { replace: true });
  }

  return {
    /** Display label for the active filter chip (the platform's own casing). */
    platformLabel: isFiltered ? matched[0]!.platform : null,
    /** Categories to render in the <select> — narrowed when a filter is active. */
    visibleCategories: isFiltered ? matched : (categories ?? []),
    isFiltered,
    clearFilter,
  };
}
