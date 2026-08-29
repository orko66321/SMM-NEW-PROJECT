export function LeaderboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      <div className="flex items-end justify-center gap-3 sm:gap-4">
        <div className="h-48 w-1/3 rounded-xl bg-surface-container-high sm:w-1/4" />
        <div className="h-56 w-1/3 rounded-xl bg-surface-container-high sm:w-1/4" />
        <div className="h-48 w-1/3 rounded-xl bg-surface-container-high sm:w-1/4" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-surface-container-high" />
        ))}
      </div>
    </div>
  );
}
