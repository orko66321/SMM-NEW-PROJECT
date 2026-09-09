import { useLanguage } from "../../context/LanguageContext.js";
import { Icon, type IconName } from "../ds/index.js";
import Reveal from "./Reveal.js";

const METHODS: { label: string; icon: IconName; color: string }[] = [
  { label: "bKash", icon: "wallet", color: "text-bkash" },
  { label: "Nagad", icon: "wallet", color: "text-nagad" },
  { label: "Rocket", icon: "wallet", color: "text-rocket" },
  { label: "USDT / Crypto", icon: "card", color: "text-emerald-400" },
  { label: "Visa / Mastercard", icon: "card", color: "text-blue-400" },
];

export default function PaymentMethods() {
  const { t } = useLanguage();
  return (
    <section className="border-t border-l-border bg-l-bg px-4 py-12 sm:px-6 sm:py-14 lg:px-10">
      <Reveal className="mx-auto max-w-6xl text-center">
        <p className="mx-auto mb-6 max-w-xs text-[11px] font-semibold uppercase tracking-[0.14em] text-l-body sm:mb-7 sm:max-w-none sm:text-xs sm:tracking-[0.2em]">
          {t("landing.payments.heading")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:gap-x-10 sm:gap-y-5">
          {METHODS.map((m) => (
            <span
              key={m.label}
              className={`flex items-center gap-1.5 font-headline text-base font-bold transition-transform hover:scale-110 sm:gap-2 sm:text-lg ${m.color}`}
            >
              <Icon name={m.icon} size={18} />
              {m.label}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
