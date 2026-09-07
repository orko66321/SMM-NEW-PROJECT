import { useLanguage } from "../../context/LanguageContext.js";
import { Icon, type IconName } from "../ds/index.js";
import Reveal from "./Reveal.js";
import SectionHeading from "./SectionHeading.js";

const CARDS: { key: string; icon: IconName }[] = [
  { key: "pricing", icon: "tag" },
  { key: "api", icon: "provider" },
  { key: "delivery", icon: "refresh" },
  { key: "support", icon: "check-circle" },
];

export default function WhyChoose() {
  const { t } = useLanguage();
  return (
    <section id="why-us" className="px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow={t("landing.why.eyebrow")}
          title={t("landing.whyHeading")}
          subtitle={t("landing.why.subtitle")}
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((card, i) => (
            <Reveal
              key={card.key}
              delay={i * 90}
              className="ll-card group rounded-2xl border border-l-border bg-l-surface p-7"
            >
              <span className="mb-6 flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-l-primary to-l-accent text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                <Icon name={card.icon} size={24} />
              </span>
              <h3 className="mb-2.5 font-headline text-lg font-bold text-l-heading">
                {t(`landing.features.${card.key}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-l-body">
                {t(`landing.features.${card.key}.body`)}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
