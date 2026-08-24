import { useCurrency } from "../../context/CurrencyContext.js";

export default function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex overflow-hidden rounded-md border border-outline-variant text-xs font-medium">
      {(["USD", "BDT"] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCurrency(c)}
          className={`px-2.5 py-1.5 transition ${currency === c ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:bg-surface-container-high"}`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
