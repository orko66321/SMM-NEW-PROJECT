import type { ReactNode } from "react";
import { useLanguage } from "../../context/LanguageContext.js";
import "../../styles/panel-glass.css";

// Shared shell for every dashboard page on the violet-glass theme: the
// full-bleed ground (styles/panel-glass.css › .no-page) + a centered
// max-width column. `lang` on the root makes Bengali render in Noto Sans
// Bengali on these pages.
export function GlassPage({ children }: { children: ReactNode }) {
  const { lang } = useLanguage();
  return (
    <div className="no-page" lang={lang}>
      <div className="mx-auto max-w-[1240px] min-w-0 space-y-6">{children}</div>
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  subtitle,
  action,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker && (
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d2bbff]">
            <span className="h-px w-5 bg-gradient-to-r from-[#d2bbff] to-transparent" />
            {kicker}
          </p>
        )}
        <h1 className="mt-2 font-headline text-2xl font-bold text-[#f4f2fb] sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-[54ch] text-sm text-[#c7c4d7]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
