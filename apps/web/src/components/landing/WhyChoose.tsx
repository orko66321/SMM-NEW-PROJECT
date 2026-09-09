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
    <section id="why-us" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow={t("landing.why.eyebrow")}
          title={t("landing.whyHeading")}
          subtitle={t("landing.why.subtitle")}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {CARDS.map((card, i) => (
            <Reveal
              key={card.key}
              delay={i * 90}
              className="ll-card group flex items-start gap-4 rounded-2xl border border-l-border bg-l-surface p-5 sm:flex-col sm:gap-0 sm:p-6 lg:p-7"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-l-primary to-l-accent text-white shadow-lg transition-transform duration-300 group-hover:scale-110 sm:mb-5 sm:size-14">
                <Icon name={card.icon} size={22} />
              </span>
              <div className="min-w-0">
                <h3 className="mb-1.5 font-headline text-base font-bold text-l-heading sm:mb-2.5 sm:text-lg">
                  {t(`landing.features.${card.key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-l-body">
                  {t(`landing.features.${card.key}.body`)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
