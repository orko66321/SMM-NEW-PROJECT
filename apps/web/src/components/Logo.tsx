// AIO monogram — A (grow), I (connect), O (network ring) — one stroke
// weight throughout. See brand mockup: violet #6D28D9 -> #8B5CF6 gradient
// on dark, single-color (currentColor) elsewhere.
function AioMark({ className, gradient = false }: { className?: string; gradient?: boolean }) {
  const id = gradient ? "logo-gradient" : undefined;
  return (
    <svg viewBox="0 0 252 110" className={className} aria-hidden="true">
      {gradient && (
        <defs>
          <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>
        </defs>
      )}
      <g
        fill="none"
        stroke={gradient ? `url(#${id})` : "currentColor"}
        strokeWidth={14}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      >
        <path d="M14 100 L52 25 L90 100" />
        <path d="M118 10 L118 100" />
        <path d="M223.3 22.6 A45 45 0 0 1 223.3 87.4" />
        <path d="M204.4 98.3 A45 45 0 0 1 148.3 65.9" />
        <path d="M148.3 44.1 A45 45 0 0 1 204.4 11.7" />
      </g>
      <g fill={gradient ? `url(#${id})` : "currentColor"}>
        <circle cx="214.5" cy="16" r="11" />
        <circle cx="214.5" cy="94" r="11" />
        <circle cx="147" cy="55" r="11" />
      </g>
    </svg>
  );
}

// Compact "A" only — for tight spaces (favicon-scale, avatar fallback).
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 104 110" className={className} aria-hidden="true">
      <path
        d="M14 100 L52 25 L90 100"
        fill="none"
        stroke="currentColor"
        strokeWidth={14}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

const sizeMap = {
  sm: { mark: "h-6 w-auto", name: "text-sm", tagline: false },
  md: { mark: "h-8 w-auto", name: "text-base", tagline: false },
  lg: { mark: "h-12 w-auto", name: "text-2xl", tagline: true },
} as const;

// Full lockup — mark + "ALL IN ONE" / "SERVICE" wordmark. Used everywhere
// the old per-page "SMM Panel" / "SMM Elite" / "Admin Panel" text blocks
// used to be hand-rolled independently — this is now the single source.
export function Logo({
  size = "md",
  className = "",
}: {
  size?: keyof typeof sizeMap;
  className?: string;
}) {
  const s = sizeMap[size];
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <AioMark gradient className={`${s.mark} shrink-0 text-primary`} />
      <span className="flex flex-col leading-none">
        <span className={`font-display font-medium tracking-[0.08em] text-on-surface ${s.name}`}>
          ALL IN <span className="text-primary-container">ONE</span>
        </span>
        {s.tagline && (
          <span className="mt-1 font-mono text-[10px] font-light tracking-[0.4em] text-on-surface-variant">
            SERVICE
          </span>
        )}
      </span>
    </span>
  );
}
