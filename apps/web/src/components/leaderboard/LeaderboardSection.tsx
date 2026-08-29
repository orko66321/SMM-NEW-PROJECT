import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getLeaderboard } from "../../api/resources.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { AlertIcon, TrophyIcon } from "./icons.js";
import { LeaderboardCard } from "./LeaderboardCard.js";
import { LeaderboardRow } from "./LeaderboardRow.js";
import { LeaderboardSkeleton } from "./LeaderboardSkeleton.js";
import type { LeaderboardEntry } from "./types.js";

// Real GET /leaderboard/top-spenders (see apps/api/src/services/leaderboard.service.ts) —
// ranked by each user's actual lifetime spend (sum of COMPLETED order
// charges), not placeholder data. isCurrentUser is derived here since the
// endpoint only returns userId, not who's asking.
async function fetchLeaderboard(currentUserId?: string): Promise<LeaderboardEntry[]> {
  const entries = (await getLeaderboard()) as LeaderboardEntry[];
  return entries.map((e) => ({ ...e, isCurrentUser: !!currentUserId && e.userId === currentUserId }));
}

export function LeaderboardSection({ currentUserId, isAdmin }: { currentUserId?: string; isAdmin?: boolean }) {
  const { t } = useLanguage();
  const {
    data: entries,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["leaderboard", "top-spenders", currentUserId],
    queryFn: () => fetchLeaderboard(currentUserId),
  });

  const podium = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3, 10) ?? [];
  // Podium rendered left-to-right as [2, 1, 3] on desktop so rank 1 sits in
  // the visually dominant center slot; on mobile it collapses back to
  // natural rank order (1, 2, 3) via the sm:order-* overrides below.
  const podiumOrder = ["sm:order-2", "sm:order-1", "sm:order-3"];

  return (
    <section className="card space-y-6" aria-labelledby="leaderboard-heading">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-warning">
            <TrophyIcon className="h-3.5 w-3.5" />
            {t("leaderboard.eyebrow")}
          </p>
          <h2 id="leaderboard-heading" className="mt-1.5 text-xl font-bold sm:text-2xl">
            {t("leaderboard.headingPrefix")}{" "}
            <span className="bg-gradient-to-r from-warning via-amber-400 to-amber-300 bg-clip-text text-transparent">
              {t("leaderboard.headingAccent")}
            </span>
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">{t("leaderboard.subtitle")}</p>
        </div>
        <Link to="/dashboard/leaderboard" className="btn-ghost shrink-0 self-start border border-outline-variant">
          {t("leaderboard.viewFullCta")}
        </Link>
      </header>

      {isLoading && <LeaderboardSkeleton />}

      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-error/30 bg-error/5 px-4 py-10 text-center">
          <AlertIcon className="h-8 w-8 text-error" />
          <p className="text-sm font-medium text-on-surface">{t("leaderboard.errorTitle")}</p>
          <button type="button" onClick={() => refetch()} className="btn-ghost !min-h-[36px] border border-outline-variant !px-4 !py-1.5 text-xs">
            {t("leaderboard.retry")}
          </button>
        </div>
      )}

      {!isLoading && !isError && entries && entries.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-outline-variant px-4 py-10 text-center">
          <TrophyIcon className="h-8 w-8 text-on-surface-variant/50" />
          <p className="text-sm text-on-surface-variant">{t("leaderboard.empty")}</p>
        </div>
      )}

      {!isLoading && !isError && podium.length > 0 && (
        <>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:gap-4">
            {podium.map((entry, i) => (
              <div key={entry.userId} className={`sm:flex-1 ${podiumOrder[i]}`}>
                <LeaderboardCard
                  entry={entry}
                  topSpenderLabel={t("leaderboard.topSpenderBadge")}
                  youLabel={t("leaderboard.you")}
                  pointsSuffix={t("leaderboard.pointsSuffix")}
                  animationDelayMs={i * 90}
                />
              </div>
            ))}
          </div>

          {rest.length > 0 && (
            <div className="divide-y divide-outline-variant/60 border-t border-outline-variant/60 pt-1">
              {rest.map((entry) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  pointsSuffix={t("leaderboard.pointsSuffix")}
                  youLabel={t("leaderboard.you")}
                  menuLabel={t("leaderboard.rowMenuLabel")}
                  viewProfileLabel={t("leaderboard.viewProfile")}
                  viewOrdersLabel={t("leaderboard.viewOrders")}
                  showMenu={isAdmin}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
