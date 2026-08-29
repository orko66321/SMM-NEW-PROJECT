import { CrownIcon, MedalIcon } from "./icons.js";
import { LeaderboardAvatar } from "./LeaderboardAvatar.js";
import { SpendPointsChip } from "./SpendPointsChip.js";
import type { LeaderboardEntry } from "./types.js";

const BRONZE_STYLE = { ring: "ring-[#B5651D]/60", badge: "bg-surface-container-highest text-on-surface", medal: "text-[#CD7F32]" };
const RANK_STYLES: Record<number, typeof BRONZE_STYLE> = {
  1: { ring: "ring-warning/70", badge: "bg-warning text-surface-deep", medal: "text-warning" },
  2: { ring: "ring-on-surface-variant/40", badge: "bg-surface-container-highest text-on-surface", medal: "text-on-surface-variant" },
  3: BRONZE_STYLE,
};

export function LeaderboardCard({
  entry,
  topSpenderLabel,
  youLabel,
  pointsSuffix,
  animationDelayMs,
}: {
  entry: LeaderboardEntry;
  topSpenderLabel: string;
  youLabel: string;
  pointsSuffix: string;
  animationDelayMs: number;
}) {
  const isFirst = entry.rank === 1;
  const styles = RANK_STYLES[entry.rank] ?? BRONZE_STYLE;

  return (
    <div
      className={`motion-safe:animate-fade-scale-in flex flex-col items-center rounded-xl border p-5 text-center backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 ${
        isFirst
          ? "border-warning/40 bg-gradient-to-b from-warning/15 via-surface-container to-surface-container pt-8 shadow-[0_8px_40px_-12px_rgba(245,158,11,0.35)] sm:scale-110"
          : "border-outline-variant bg-surface-container/80 shadow-lg shadow-surface-deep/20"
      }`}
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      {isFirst && (
        <span className="motion-safe:animate-glow-pulse mb-2 inline-flex items-center gap-1 rounded-full bg-warning px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-surface-deep">
          {topSpenderLabel}
        </span>
      )}

      <div className="relative">
        <LeaderboardAvatar name={entry.displayName} avatarUrl={entry.avatarUrl} size={isFirst ? "lg" : "md"} ringClassName={styles.ring} />
        <div
          className={`absolute -top-3 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border-2 border-surface-container ${styles.badge}`}
          aria-hidden="true"
        >
          {isFirst ? <CrownIcon className="h-4 w-4" /> : <MedalIcon className={`h-4 w-4 ${styles.medal}`} />}
        </div>
        <span
          className={`absolute -bottom-1 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-2 border-surface-container bg-surface-container-highest font-mono text-xs font-bold text-on-surface`}
        >
          {entry.rank}
        </span>
      </div>

      <p className={`mt-4 truncate font-display font-bold text-on-surface ${isFirst ? "text-lg" : "text-sm"}`}>
        {entry.displayName}
        {entry.isCurrentUser && <span className="ml-1.5 align-middle text-xs font-semibold text-primary-container">({youLabel})</span>}
      </p>

      <div className="mt-2">
        <SpendPointsChip points={entry.spendPoints} suffix={pointsSuffix} size={isFirst ? "lg" : "sm"} />
      </div>
    </div>
  );
}
