import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DisplayCurrency } from "@smm/shared";
import { getPublicSettings } from "../api/resources.js";

const STORAGE_KEY = "smm_display_currency";

interface CurrencyContextValue {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
  /** Every stored/priced amount is USD server-side — this only changes how it's displayed. */
  formatCurrency: (usdAmount: number | string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readStoredCurrency(): DisplayCurrency | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "USD" || stored === "BDT" ? stored : null;
  } catch {
    return null; // private browsing / storage blocked — fall back to the default
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 60_000 });
  const [override, setOverride] = useState<DisplayCurrency | null>(readStoredCurrency);

  const currency = override ?? settings?.defaultCurrency ?? "USD";
  const rate = Number(settings?.usdToBdtRate ?? 110);

  const setCurrency = useCallback((next: DisplayCurrency) => {
    setOverride(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — per-viewer convenience only, not load-bearing
    }
  }, []);

  const formatCurrency = useCallback(
    (usdAmount: number | string) => {
      const usd = Number(usdAmount);
      if (currency === "BDT") {
        return `৳${(usd * rate).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      }
      return `$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },
    [currency, rate],
  );

  const value = useMemo(() => ({ currency, setCurrency, formatCurrency }), [currency, setCurrency, formatCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
