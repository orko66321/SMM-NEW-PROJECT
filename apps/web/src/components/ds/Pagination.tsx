import { Icon } from "./Icon.js";
import { cn } from "./cn.js";

// Table pager — Prev / Page n of m / Next. No numbered page jumps (the admin
// lists never render them). Labels are props so callers can pass translated
// strings; they default to English.
export function Pagination({
  page,
  totalPages,
  onChange,
  labels,
  className,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  labels?: { prev?: string; next?: string; status?: string };
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const prev = labels?.prev ?? "Prev";
  const next = labels?.next ?? "Next";
  const status = labels?.status ?? `Page ${page} of ${totalPages}`;
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <button
        type="button"
        className="btn-ghost !min-h-[40px] !px-3 !py-1.5 !text-xs"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <Icon name="chevron-left" size={16} />
        {prev}
      </button>
      <span className="font-mono text-xs text-on-surface-variant">{status}</span>
      <button
        type="button"
        className="btn-ghost !min-h-[40px] !px-3 !py-1.5 !text-xs"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        {next}
        <Icon name="chevron-right" size={16} />
      </button>
    </div>
  );
}
