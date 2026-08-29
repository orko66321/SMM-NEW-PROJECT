import { Fragment } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icon.js";
import { cn } from "./cn.js";

// Admin wayfinding — mandatory below the first level. The last item is the
// current page (no link).
export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav className={cn("flex flex-wrap items-center gap-1 text-xs text-on-surface-variant", className)} aria-label="Breadcrumb">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <Fragment key={i}>
            {i > 0 && <Icon name="chevron-right" size={13} className="text-on-surface-variant/50" />}
            {item.to && !last ? (
              <Link to={item.to} className="transition hover:text-accent-on-dark">
                {item.label}
              </Link>
            ) : (
              <span className={last ? "font-medium text-on-surface" : undefined}>{item.label}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
