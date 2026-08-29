import { useEffect, useRef, useState } from "react";
import { DotsIcon } from "./icons.js";
import { LeaderboardAvatar } from "./LeaderboardAvatar.js";
import { SpendPointsChip } from "./SpendPointsChip.js";
import type { LeaderboardEntry } from "./types.js";

function RowMenu({ viewProfileLabel, viewOrdersLabel, menuLabel }: { viewProfileLabel: string; viewOrdersLabel: string; menuLabel: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={menuLabel}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container-highest hover:text-on-surface"
      >
        <DotsIcon className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-10 w-44 overflow-hidden rounded-md border border-outline-variant bg-surface-container-high shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block w-full px-3 py-2.5 text-left text-sm text-on-surface transition hover:bg-surface-container-highest"
          >
            {viewProfileLabel}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block w-full px-3 py-2.5 text-left text-sm text-on-surface transition hover:bg-surface-container-highest"
          >
            {viewOrdersLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export function LeaderboardRow({
  entry,
  pointsSuffix,
  youLabel,
  menuLabel,
  viewProfileLabel,
  viewOrdersLabel,
  showMenu,
}: {
  entry: LeaderboardEntry;
  pointsSuffix: string;
  youLabel: string;
  menuLabel: string;
  viewProfileLabel: string;
  viewOrdersLabel: string;
  showMenu?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-container-high ${
        entry.isCurrentUser ? "bg-primary/5 ring-1 ring-primary/30" : ""
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high font-mono text-sm font-bold text-on-surface-variant">
        {entry.rank}
      </span>

      <LeaderboardAvatar name={entry.displayName} avatarUrl={entry.avatarUrl} size="sm" />

      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-on-surface">
        {entry.displayName}
        {entry.isCurrentUser && <span className="ml-1.5 text-xs font-medium text-primary-container">({youLabel})</span>}
      </span>

      <SpendPointsChip points={entry.spendPoints} suffix={pointsSuffix} size="sm" />

      {showMenu && <RowMenu menuLabel={menuLabel} viewProfileLabel={viewProfileLabel} viewOrdersLabel={viewOrdersLabel} />}
    </div>
  );
}
