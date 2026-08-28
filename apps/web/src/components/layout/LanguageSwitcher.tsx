import { useLanguage } from "../../context/LanguageContext.js";
import type { Lang } from "../../i18n/translations.js";

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "bn", label: "বাং" },
];

// Same segmented-control shape as CurrencySwitcher, so the two sit
// naturally side by side in the header — but with a globe icon since this
// one needs to be spotted at a glance, not just recognized once found.
export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-1.5">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20" />
      </svg>
      <div className="flex overflow-hidden rounded-md border border-outline-variant text-xs font-semibold">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLang(opt.value)}
            aria-pressed={lang === opt.value}
            className={`px-2.5 py-1.5 transition ${
              lang === opt.value ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
