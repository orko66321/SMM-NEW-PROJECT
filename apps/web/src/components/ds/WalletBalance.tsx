import { useLanguage } from "../../context/LanguageContext.js";
import { Icon } from "./Icon.js";
import { cn } from "./cn.js";

// The one sanctioned full-gradient surface in the system (135deg #8B5CF6 ->
// #6D28D9) — one per screen, on the wallet. Never mix hues.
export function WalletBalance({
  balance,
  secondary,
  currency = "USD",
  onTopUp,
  className,
}: {
  balance: string;
  secondary?: string;
  currency?: string;
  onTopUp?: () => void;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(
        "gradient-wallet flex flex-wrap items-center justify-between gap-4 rounded-card p-5",
        className,
      )}
    >
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.05em] opacity-80">
          <Icon name="wallet" size={16} />
          {t("overview.walletBalance")}
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="font-display text-4xl font-bold leading-none tracking-tight">{balance}</span>
          <span className="font-mono text-[13px] opacity-75">{currency}</span>
        </div>
        {secondary && <div className="mt-1 font-mono text-xs opacity-75">{secondary}</div>}
      </div>
      {onTopUp && (
        <button
          type="button"
          onClick={onTopUp}
          className="inline-flex h-11 items-center gap-2 rounded-control border border-white/30 bg-white/15 px-4 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
        >
          <Icon name="plus" size={18} />
          {t("dashboardLayout.nav.addFunds")}
        </button>
      )}
    </div>
  );
}
