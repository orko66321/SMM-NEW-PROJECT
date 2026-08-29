import type { ReactNode } from "react";
import { cn } from "./cn.js";
import { Icon, type IconName } from "./Icon.js";

// Zero-data state for tables, order/ticket lists and search results — a blank
// grid reads as a bug.
export function EmptyState({
  icon = "orders",
  title,
  message,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid justify-items-center gap-2 px-6 py-12 text-center", className)}>
      <div className="grid h-14 w-14 place-items-center rounded-full border border-outline-variant bg-surface-container-high text-on-surface-variant/70">
        <Icon name={icon} size={26} />
      </div>
      <h3 className="mt-1.5 font-display text-base font-semibold text-on-surface">{title}</h3>
      {message && (
        <p className="max-w-xs text-sm leading-5 text-on-surface-variant/70">{message}</p>
      )}
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  );
}
