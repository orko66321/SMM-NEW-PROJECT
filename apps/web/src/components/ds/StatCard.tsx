import { cn } from "./cn.js";
import { Icon, type IconName } from "./Icon.js";

// Dashboard header metric tile. `accent` (violet-tinted) is reserved for the
// single most important figure on a screen — usually the wallet balance;
// more than one flattens the hierarchy. Values render in mono.
export function StatCard({
  label,
  value,
  icon,
  delta,
  deltaTone = "success",
  accent = false,
  className,
}: {
  label: string;
  value: string | number;
  icon?: IconName;
  delta?: string;
  deltaTone?: "success" | "error";
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-1.5 rounded-card border p-4 sm:p-5",
        accent ? "border-primary/35 bg-primary/10" : "border-outline-variant bg-surface-low",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="label mb-0">{label}</span>
        {icon && <Icon name={icon} size={18} className="text-accent-on-dark" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold tracking-tight text-on-surface sm:text-[32px] sm:leading-none">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-mono text-xs",
              deltaTone === "error" ? "text-error" : "text-success",
            )}
          >
            <Icon name={deltaTone === "error" ? "trending-down" : "trending-up"} size={14} />
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
