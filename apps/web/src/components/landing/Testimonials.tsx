import { useLanguage } from "../../context/LanguageContext.js";
import Reveal from "./Reveal.js";
import SectionHeading from "./SectionHeading.js";

const QUOTES = [
  { key: "a", initial: "T", tint: "bg-l-primary/20 text-l-primary-bright" },
  { key: "b", initial: "R", tint: "bg-l-accent/20 text-l-accent" },
] as const;

export default function Testimonials() {
  const { t } = useLanguage();
  return (
    <section
      id="testimonials"
      className="border-t border-l-border bg-l-surface/30 px-4 py-14 sm:px-6 sm:py-20 lg:px-10 lg:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow={t("landing.testimonials.eyebrow")}
          title={t("landing.testimonials.title")}
          subtitle={t("landing.testimonials.subtitle")}
        />
        <div className="grid grid-cols-1 gap-4 sm:gap-8 md:grid-cols-2">
          {QUOTES.map((q, i) => (
            <Reveal
              key={q.key}
              delay={i * 120}
              className="ll-card flex flex-col justify-between rounded-2xl border border-l-border bg-l-surface p-5 sm:p-8"
            >
              <div>
                <div className="mb-3 text-sm tracking-widest text-yellow-400 sm:mb-4" aria-label="5 out of 5 stars">
                  ★★★★★
                </div>
                <p className="mb-5 text-[15px] italic leading-relaxed text-l-body sm:mb-6 sm:text-base">
                  “{t(`landing.testimonials.${q.key}.quote`)}”
                </p>
              </div>
              <div className="flex items-center gap-3.5 border-t border-l-border pt-4 sm:gap-4">
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full font-headline font-bold sm:size-12 ${q.tint}`}
                >
                  {q.initial}
                </span>
                <div>
                  <h4 className="font-headline text-sm font-bold text-l-heading">
                    {t(`landing.testimonials.${q.key}.name`)}
                  </h4>
                  <p className="text-xs text-l-body">{t(`landing.testimonials.${q.key}.role`)}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
