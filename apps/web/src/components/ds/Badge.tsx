import type { HTMLAttributes } from "react";
import { cn } from "./cn.js";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "error" | "info";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "badge-neutral",
  primary: "badge-primary",
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  info: "badge-info",
};

// Low-saturation fill (15%), 30% border, full-strength text. Base for every
// tag and status chip. `mono` for bracketed service qualifiers.
export function Badge({
  tone = "neutral",
  mono = false,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; mono?: boolean }) {
  return (
    <span
      className={cn(
        "badge",
        TONE_CLASS[tone],
        mono && "font-mono font-medium tracking-normal",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
