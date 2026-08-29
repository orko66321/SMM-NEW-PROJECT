import { cn } from "./cn.js";

// Status filters (Orders History) and section switches. Pill-radius is
// reserved for filters + status, so tabs render as pills here.
export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export function Tabs({
  items,
  activeId,
  onChange,
  className,
}: {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("aio-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1", className)}>
      {items.map((it) => {
        const active = it.id === activeId;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition duration-150 ease-ds",
              active
                ? "border-primary/40 bg-primary/15 text-accent-on-dark"
                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
            )}
          >
            {it.label}
            {typeof it.count === "number" && (
              <span className="font-mono text-xs opacity-70">{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
