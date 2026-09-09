import { useLanguage } from "../../context/LanguageContext.js";
import Reveal from "./Reveal.js";
import SectionHeading from "./SectionHeading.js";

const STEPS = ["1", "2", "3"] as const;

export default function HowItWorks() {
  const { t } = useLanguage();
  return (
    <section id="how-it-works" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow={t("landing.how.eyebrow")}
          title={t("landing.how.title")}
          subtitle={t("landing.how.subtitle")}
        />
        <div className="grid grid-cols-1 gap-4 sm:gap-8 md:grid-cols-3">
          {STEPS.map((n, i) => (
            <Reveal
              key={n}
              delay={i * 110}
              className="ll-card flex items-start gap-4 rounded-2xl border border-l-border bg-l-surface p-5 sm:relative sm:block sm:p-8 sm:pt-10"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-l-primary font-headline text-sm font-bold text-white shadow-lg shadow-l-primary/30 sm:absolute sm:-top-4 sm:left-8 sm:size-10 sm:text-base">
                0{n}
              </span>
              <div className="min-w-0">
                <h3 className="mb-1.5 font-headline text-base font-bold text-l-heading sm:mb-2 sm:text-lg">
                  {t(`landing.how.steps.${n}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-l-body">{t(`landing.how.steps.${n}.body`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
