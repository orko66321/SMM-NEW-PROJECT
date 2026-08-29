import { useEffect, type ReactNode } from "react";
import { useLanguage } from "../../context/LanguageContext.js";
import { cn } from "./cn.js";
import { Icon } from "./Icon.js";

// Glassmorphic dialog (L3 overlay): translucent surface + 12px backdrop blur,
// Esc to close, body scroll-lock, click-outside. Bottom sheet on mobile,
// centred card on desktop. Generalised from ServiceDetailsModal.
export function Modal({
  title,
  subtitle,
  onClose,
  footer,
  children,
  size = "md",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const { t } = useLanguage();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-surface-deep/70 backdrop-blur-[12px]" onClick={onClose} aria-hidden />
      <div
        className={cn(
          "glass relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-card border border-outline-variant shadow-overlay",
          "sm:rounded-card",
          size === "sm" && "sm:max-w-sm",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-outline-variant px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold leading-snug text-on-surface sm:text-lg">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 font-mono text-xs text-on-surface-variant">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="aio-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && <div className="shrink-0 border-t border-outline-variant px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
