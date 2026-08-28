import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicBanners } from "../../api/resources.js";
import { useLanguage } from "../../context/LanguageContext.js";

export interface BannerSlide {
  id: string;
  link: string;
  image: string;
}

const AUTOPLAY_MS = 3500;

function SlideLink({ link, children, className }: { link: string; children: ReactNode; className?: string }) {
  // "/" (or empty) is an in-app path — client-side nav, same tab. Anything
  // else (a real URL) is treated as external — new tab, real navigation,
  // since it's leaving the SPA entirely.
  if (link.startsWith("/")) {
    return (
      <Link to={link} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

export default function BannerSlider({ slides: slidesProp }: { slides?: BannerSlide[] }) {
  const { t } = useLanguage();
  const shouldFetch = slidesProp === undefined;
  const { data, isLoading } = useQuery({
    queryKey: ["public-banners"],
    queryFn: getPublicBanners,
    enabled: shouldFetch,
    staleTime: 60_000,
  });
  const slides: BannerSlide[] = slidesProp ?? data ?? [];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // A banner list change (admin added/removed one) could leave the
    // current index pointing past the end — snap back rather than
    // rendering a blank slide.
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, slides.length]);

  if (shouldFetch && isLoading) {
    return <div className="aspect-[16/7] w-full animate-pulse rounded-2xl bg-surface-container-high" />;
  }
  if (slides.length === 0) return null;

  function goTo(i: number) {
    setIndex(((i % slides.length) + slides.length) % slides.length);
  }

  return (
    <div
      className="group relative w-full overflow-hidden rounded-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="aspect-[16/7] w-full overflow-hidden">
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide) => (
            <SlideLink key={slide.id} link={slide.link} className="block h-full w-full shrink-0">
              <img src={slide.image} alt="" className="h-full w-full object-cover" draggable={false} />
            </SlideLink>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label={t("bannerSlider.prev")}
            onClick={() => goTo(index - 1)}
            className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface-deep/60 text-on-surface opacity-0 backdrop-blur transition hover:bg-surface-deep/80 group-hover:opacity-100 sm:h-10 sm:w-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={t("bannerSlider.next")}
            onClick={() => goTo(index + 1)}
            className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface-deep/60 text-on-surface opacity-0 backdrop-blur transition hover:bg-surface-deep/80 group-hover:opacity-100 sm:h-10 sm:w-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={t("bannerSlider.goTo", { n: i + 1 })}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
