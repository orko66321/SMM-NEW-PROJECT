// A single row of the Top Spend Leaderboard. `spendPoints` is lifetime
// cumulative spend at a fixed ratio (1 taka spent = 1 point) — computed
// server-side in apps/api/src/services/leaderboard.service.ts from real
// COMPLETED-order totals, fetched via GET /leaderboard/top-spenders.
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  spendPoints: number;
  isCurrentUser?: boolean;
}
