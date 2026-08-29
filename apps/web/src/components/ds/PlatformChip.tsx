import type { ReactNode } from "react";
import { cn } from "./cn.js";

// Horizontally-scrolling platform filter row above the catalogue / order
// form. Platform logos are not in the design system (trademark + no assets)
// — these are text pills.
export function PlatformChip({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition duration-150 ease-ds",
        active
          ? "border-primary/40 bg-primary/15 text-accent-on-dark"
          : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
      )}
    >
      {label}
    </button>
  );
}

export function PlatformChipRow({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("aio-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1", className)}>{children}</div>
  );
}
