import { useEffect, useRef, useState } from "react";

// Animates 0 → target once the element scrolls into view. Returns the ref to
// attach and the current display value. Honours prefers-reduced-motion (jumps
// straight to the target) and never animates a falsy/zero target.
export function useCountUp<T extends HTMLElement = HTMLElement>(target: number, durationMs = 1400) {
  const ref = useRef<T | null>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !target) {
      setValue(target || 0);
      return;
    }

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      setValue(target);
      return;
    }

    let raf = 0;
    let start = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const tick = (now: number) => {
          if (!start) start = now;
          const p = Math.min((now - start) / durationMs, 1);
          // easeOutCubic
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(target * eased));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs]);

  return { ref, value };
}
