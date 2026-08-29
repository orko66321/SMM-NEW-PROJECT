import { cn } from "./cn.js";

// The "Important!" panel pattern — every ordering / payment rule ships in
// English on top, Bengali directly beneath in a lighter neutral at 1.2x
// line-height. Never side by side, never Bengali only.
type Tone = "primary" | "warning" | "info" | "success" | "error";

const RULE: Record<Tone, string> = {
  primary: "border-primary-hover",
  warning: "border-warning",
  info: "border-info",
  success: "border-success",
  error: "border-error",
};

export function BilingualNote({
  en,
  bn,
  tone = "primary",
  className,
}: {
  en: string;
  bn?: string | null;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("border-l-2 pl-4", RULE[tone], className)}>
      <p className="text-sm leading-[1.5] text-on-surface">{en}</p>
      {bn && (
        <p lang="bn" className="mt-1 font-bengali text-[13px] leading-normal text-on-surface-variant/85">
          {bn}
        </p>
      )}
    </div>
  );
}
