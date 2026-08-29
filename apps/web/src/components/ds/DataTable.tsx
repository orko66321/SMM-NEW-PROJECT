import type { ReactNode } from "react";
import { cn } from "./cn.js";

// Sticky-header data table — orders, services, users, deposits. 48px rows
// (dense = 40px for admin), mono numerics, 6% violet row hover. Scrolls
// inside its own container so it never blows out the page width on mobile.
export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  mono?: boolean;
  width?: string;
  render?: (row: T) => ReactNode;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  rows,
  dense = false,
  empty,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  dense?: boolean;
  empty?: ReactNode;
  className?: string;
}) {
  const cellPad = dense ? "px-3.5 py-2.5" : "px-4 py-3.5";
  return (
    <div
      className={cn(
        "aio-scroll overflow-auto rounded-card border border-outline-variant bg-surface-low",
        className,
      )}
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width, textAlign: c.align ?? "left" }}
                className={cn(
                  "sticky top-0 z-[2] whitespace-nowrap border-b border-outline-variant bg-surface-container-high",
                  "text-xs font-semibold uppercase tracking-[0.05em] text-on-surface-variant",
                  cellPad,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-on-surface-variant/70">
                {empty ?? "No records"}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="row-hover">
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{ textAlign: c.align ?? "left" }}
                  className={cn(
                    "border-b border-outline-variant/45 align-middle text-on-surface",
                    c.mono ? "font-mono text-[13px]" : "text-sm",
                    cellPad,
                  )}
                >
                  {c.render ? c.render(row) : (row as Record<string, ReactNode>)[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
