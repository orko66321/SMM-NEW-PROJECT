import { useLanguage } from "../../context/LanguageContext.js";
import { Icon, type IconName } from "../ds/index.js";
import Reveal from "./Reveal.js";

const ITEMS: { key: string; icon: IconName; tint: string }[] = [
  { key: "delivery", icon: "send", tint: "bg-l-primary/15 text-l-primary-bright" },
  { key: "payments", icon: "card", tint: "bg-l-accent/15 text-l-accent" },
  { key: "api", icon: "provider", tint: "bg-fuchsia-500/15 text-fuchsia-400" },
  { key: "support", icon: "support", tint: "bg-emerald-500/15 text-emerald-400" },
];

export default function TrustBar() {
  const { t } = useLanguage();
  return (
    <section className="border-y border-l-border bg-l-surface/40 px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((item, i) => (
          <Reveal
            key={item.key}
            delay={i * 80}
            className="ll-card flex items-center gap-4 rounded-xl border border-l-border bg-l-surface p-5"
          >
            <span className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${item.tint}`}>
              <Icon name={item.icon} size={22} />
            </span>
            <div>
              <h3 className="font-headline text-base font-bold text-l-heading">
                {t(`landing.trust.${item.key}.title`)}
              </h3>
              <p className="mt-0.5 text-xs text-l-body">{t(`landing.trust.${item.key}.body`)}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
