import { useLanguage } from "../../context/LanguageContext.js";
import Reveal from "./Reveal.js";
import SectionHeading from "./SectionHeading.js";

const STEPS = ["1", "2", "3"] as const;

export default function HowItWorks() {
  const { t } = useLanguage();
  return (
    <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow={t("landing.how.eyebrow")}
          title={t("landing.how.title")}
          subtitle={t("landing.how.subtitle")}
        />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((n, i) => (
            <Reveal
              key={n}
              delay={i * 110}
              className="ll-card relative rounded-2xl border border-l-border bg-l-surface p-8 pt-10"
            >
              <span className="absolute -top-4 left-8 flex size-10 items-center justify-center rounded-xl bg-l-primary font-headline font-bold text-white shadow-lg shadow-l-primary/30">
                0{n}
              </span>
              <h3 className="mb-2 font-headline text-lg font-bold text-l-heading">
                {t(`landing.how.steps.${n}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-l-body">{t(`landing.how.steps.${n}.body`)}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
