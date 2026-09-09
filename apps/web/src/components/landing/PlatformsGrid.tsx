import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext.js";
import { Icon, type IconName } from "../ds/index.js";
import Reveal from "./Reveal.js";
import SectionHeading from "./SectionHeading.js";

const DEFAULT_PLATFORMS = ["Instagram", "Telegram", "YouTube", "TikTok", "Facebook", "Twitter / X"];

function iconFor(platform: string): IconName {
  const p = platform.toLowerCase();
  if (p.includes("instagram")) return "image";
  if (p.includes("telegram")) return "send";
  if (p.includes("youtube")) return "campaign";
  if (p.includes("tiktok")) return "trending-up";
  if (p.includes("facebook")) return "users";
  if (p.includes("twitter") || p === "x") return "send";
  if (p.includes("linkedin") || p.includes("website") || p.includes("traffic")) return "globe";
  return "globe";
}

export default function PlatformsGrid({ platforms }: { platforms: string[] }) {
  const { t } = useLanguage();
  const list = (platforms.length > 0 ? platforms : DEFAULT_PLATFORMS).slice(0, 12);

  return (
    <section
      id="platforms"
      className="border-y border-l-border bg-l-surface/30 px-4 py-14 sm:px-6 sm:py-20 lg:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow={t("landing.platforms.eyebrow")} title={t("landing.platformsHeading")} />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {list.map((platform, i) => (
            <Reveal key={platform} delay={i * 60}>
              <Link
                to="/services"
                className="ll-card group flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-l-border bg-l-surface p-4 text-center hover:border-l-accent/60 sm:gap-3 sm:rounded-2xl sm:p-6"
              >
                <span className="text-l-accent transition-transform duration-300 group-hover:scale-110">
                  <Icon name={iconFor(platform)} size={24} />
                </span>
                <span className="font-headline text-xs font-bold text-l-heading sm:text-sm">{platform}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
