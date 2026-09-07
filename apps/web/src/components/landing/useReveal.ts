import { useEffect, useRef, useState } from "react";

// One-shot scroll reveal. Returns a ref to attach to the element and a
// boolean that flips to true the first time the element is ~15% visible.
// Falls back to "always visible" when IntersectionObserver is unavailable or
// the user prefers reduced motion, so content is never hidden by JS.
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(el);

    // Safety net: never let content stay invisible if the observer misses
    // (bfcache restore, prerender, an element already fully on-screen at
    // mount that some engines don't re-notify). 1.6s is well past first paint.
    const failsafe = window.setTimeout(() => setVisible(true), 1600);

    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  return { ref, visible };
}
