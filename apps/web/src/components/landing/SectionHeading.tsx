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
    <Reveal className="mx-auto mb-14 flex max-w-2xl flex-col items-center gap-4 text-center">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-l-primary-bright">
        {eyebrow}
      </span>
      <h2 className="font-headline text-3xl font-bold tracking-tight text-l-heading sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="text-base leading-relaxed text-l-body">{subtitle}</p>}
    </Reveal>
  );
}
