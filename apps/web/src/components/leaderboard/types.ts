// A single row of the Top Spend Leaderboard. `spendPoints` is lifetime
// cumulative spend at a fixed ratio (currently 1 taka spent = 1 point) —
// see LeaderboardSection's fetch function for where this plugs into a real
// API once one exists.
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  spendPoints: number;
  isCurrentUser?: boolean;
}

// Realistic placeholder data — 10 users, sorted descending by spendPoints.
// Swap `fetchLeaderboard` in LeaderboardSection.tsx for a real endpoint;
// nothing else in this feature depends on the data being mocked.
export const PLACEHOLDER_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: "u_101", displayName: "Rafiul Islam", avatarUrl: null, spendPoints: 506821 },
  { rank: 2, userId: "u_102", displayName: "Tania Ahmed", avatarUrl: null, spendPoints: 441960 },
  { rank: 3, userId: "u_103", displayName: "Shakil Rahman", avatarUrl: null, spendPoints: 398450 },
  { rank: 4, userId: "u_104", displayName: "Mehjabin Chowdhury", avatarUrl: null, spendPoints: 312700 },
  { rank: 5, userId: "u_105", displayName: "Arafat Hossain", avatarUrl: null, spendPoints: 275300 },
  { rank: 6, userId: "u_106", displayName: "Nusrat Jahan", avatarUrl: null, spendPoints: 238150 },
  { rank: 7, userId: "u_107", displayName: "Imran Kabir", avatarUrl: null, spendPoints: 196420 },
  { rank: 8, userId: "u_108", displayName: "Farzana Akter", avatarUrl: null, spendPoints: 154980 },
  { rank: 9, userId: "u_109", displayName: "Sajid Hasan", avatarUrl: null, spendPoints: 121300 },
  { rank: 10, userId: "u_110", displayName: "Ruma Begum", avatarUrl: null, spendPoints: 96750 },
];
