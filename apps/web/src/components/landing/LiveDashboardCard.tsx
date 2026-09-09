import { useLanguage } from "../../context/LanguageContext.js";
import { Icon, type IconName } from "../ds/index.js";
import { useCountUp } from "./useCountUp.js";

interface Stats {
  totalUsers: number;
  totalOrdersCompleted: number;
  totalServices: number;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "accent" | "primary" }) {
  const { ref, value: shown } = useCountUp<HTMLParagraphElement>(value);
  return (
    <div className="rounded-xl border border-l-border bg-l-bg/60 p-4 transition-colors hover:border-l-primary/40">
      <p className="text-xs text-l-body">{label}</p>
      <p
        ref={ref}
        className={`mt-1 font-headline text-2xl font-bold tabular-nums ${
          tone === "accent" ? "text-l-accent" : "text-l-heading"
        }`}
      >
        {shown.toLocaleString()}
      </p>
    </div>
  );
}

const PREVIEW_ORDERS: { icon: IconName; title: string; meta: string; status: "done" | "processing" }[] = [
  { icon: "image", title: "Instagram Followers (HQ)", meta: "ID #94821 · Qty 5,000", status: "done" },
  { icon: "campaign", title: "YouTube Views (Retention)", meta: "ID #94822 · Qty 10,000", status: "processing" },
];

// The glassy "product preview" panel shown in the hero (desktop) / below the
// CTAs (mobile). The two headline metrics are real getPublicStats aggregates
// with a count-up; the order rows are an illustrative snapshot of the
// dashboard UI.
export default function LiveDashboardCard({
  stats,
  startingPrice,
}: {
  stats?: Stats;
  startingPrice?: string | null;
}) {
  const { t } = useLanguage();

  return (
    <div className="ll-card relative overflow-hidden rounded-2xl border border-l-border bg-l-surface/90 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-l-accent/10 blur-3xl" />

      <div className="flex items-center justify-between border-b border-l-border pb-4">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-red-500/70" />
          <span className="size-3 rounded-full bg-yellow-500/70" />
          <span className="size-3 rounded-full bg-green-500/70" />
        </div>
        <span className="flex items-center gap-2 font-mono text-[11px] text-l-body">
          <span className="ll-ping relative inline-flex size-1.5 rounded-full text-emerald-400" />
          {t("landing.preview.status")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 py-5 sm:gap-4">
        <Metric label={t("landing.stats.registeredUsers")} value={stats?.totalUsers ?? 0} tone="accent" />
        <Metric label={t("landing.stats.ordersCompleted")} value={stats?.totalOrdersCompleted ?? 0} tone="primary" />
      </div>

      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-l-heading">
          {t("landing.preview.recentOrders")}
        </p>
        {PREVIEW_ORDERS.map((o) => (
          <div
            key={o.title}
            className="flex items-center gap-2 rounded-lg border border-l-border bg-l-bg/60 p-2.5 transition-colors hover:bg-l-surface-2"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-l-primary/15 text-l-primary-bright">
                <Icon name={o.icon} size={16} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-l-heading">{o.title}</p>
                <p className="truncate text-xs text-l-body">{o.meta}</p>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                o.status === "done"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border-l-accent/20 bg-l-accent/10 text-l-accent"
              }`}
            >
              {o.status === "done" ? t("landing.preview.completed") : t("landing.preview.processing")}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-l-border pt-4 text-xs text-l-body">
        <span>
          {t("landing.preview.servicesLive", { count: (stats?.totalServices ?? 0).toLocaleString() })}
        </span>
        {startingPrice && (
          <span className="font-mono text-l-primary-bright">
            {t("landing.preview.startingFrom", { price: startingPrice })}
          </span>
        )}
      </div>
    </div>
  );
}
