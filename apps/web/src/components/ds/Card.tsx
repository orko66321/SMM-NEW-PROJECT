import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn.js";

// Surface primitive — tonal fill, 1px border, themed radius (16px customer /
// 8px admin), no resting shadow. `interactive` adds the L2 hover (ambient
// violet shadow + 1px lift). Optional hairline-separated header.
export function Card({
  header,
  interactive = false,
  padded = true,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  header?: ReactNode;
  interactive?: boolean;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-outline-variant bg-surface-card",
        padded && "p-5",
        interactive && "card-interactive",
        className,
      )}
      {...rest}
    >
      {header && (
        <div
          className={cn(
            "flex items-center gap-2 border-b border-outline-variant font-display text-base font-semibold text-on-surface",
            padded ? "-mx-5 -mt-5 mb-4 px-5 pb-3 pt-4" : "px-5 py-3",
          )}
        >
          {header}
        </div>
      )}
      {children}
    </div>
  );
}
