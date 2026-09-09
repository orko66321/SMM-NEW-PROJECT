import type { ReactNode } from "react";

// Shared frame for the static public info/legal pages linked from the navbar
// "More" menu (About, FAQ, Terms, Privacy, Contact). Matches the dark public
// theme; body prose is styled via the arbitrary-variant block below so the
// individual pages only write semantic <h2>/<p>/<ul> markup.
export default function InfoPageShell({
  title,
  subtitle,
  updated,
  children,
}: {
  title: string;
  subtitle?: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-3 text-base leading-relaxed text-on-surface-variant">{subtitle}</p>}
      {updated && <p className="mt-2 text-xs text-on-surface-variant">{updated}</p>}
      <div
        className="mt-10 space-y-6 text-sm leading-relaxed text-on-surface-variant
          [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-on-surface
          [&_h2:first-child]:mt-0
          [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5
          [&_a]:font-medium [&_a]:text-primary hover:[&_a]:underline
          [&_strong]:font-semibold [&_strong]:text-on-surface"
      >
        {children}
      </div>
    </div>
  );
}
