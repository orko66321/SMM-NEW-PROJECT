import Reveal from "./Reveal.js";

// Centered eyebrow + headline + optional lead paragraph — the shared header
// for every marketing section on the landing page.
export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Reveal className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3 text-center sm:mb-14 sm:gap-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-l-primary-bright sm:text-xs sm:tracking-[0.2em]">
        {eyebrow}
      </span>
      <h2 className="font-headline text-[25px] font-bold leading-tight tracking-tight text-l-heading sm:text-3xl lg:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="text-sm leading-relaxed text-l-body sm:text-base">{subtitle}</p>}
    </Reveal>
  );
}
