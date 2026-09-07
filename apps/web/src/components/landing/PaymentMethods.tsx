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
    <section className="border-t border-l-border bg-l-bg px-4 py-14 sm:px-6 lg:px-10">
      <Reveal className="mx-auto max-w-6xl text-center">
        <p className="mb-7 text-xs font-semibold uppercase tracking-[0.2em] text-l-body">
          {t("landing.payments.heading")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {METHODS.map((m) => (
            <span
              key={m.label}
              className={`flex items-center gap-2 font-headline text-lg font-bold transition-transform hover:scale-110 ${m.color}`}
            >
              <Icon name={m.icon} size={20} />
              {m.label}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
