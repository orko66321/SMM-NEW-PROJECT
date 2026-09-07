import type { CSSProperties, ElementType, ReactNode } from "react";
import { useReveal } from "./useReveal.js";
import { cssVars } from "./cssVar.js";

// Wraps any block of content in a scroll-triggered fade-and-rise.
// `delay` staggers siblings (ms). Renders as `as` (default <div>).
export default function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className = "",
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const { ref, visible } = useReveal<HTMLElement>();
  return (
    <Tag
      ref={ref}
      className={`ll-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ ...cssVars({ "--ll-reveal-delay": `${delay}ms` }), ...style }}
    >
      {children}
    </Tag>
  );
}
