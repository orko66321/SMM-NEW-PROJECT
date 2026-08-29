import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Icon, type IconName } from "../ds/Icon.js";

type Variant = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  variant: Variant;
}

interface ToastContextValue {
  push: (message: string, variant?: Variant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE: Record<Variant, { icon: IconName; rule: string; text: string }> = {
  success: { icon: "check-circle", rule: "border-l-success", text: "text-success" },
  error: { icon: "error", rule: "border-l-error", text: "text-error" },
  warning: { icon: "warning", rule: "border-l-warning", text: "text-warning" },
  info: { icon: "info", rule: "border-l-info", text: "text-info" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, variant: Variant = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {/* Stack bottom-right on desktop, top-full-width on mobile */}
      <div className="pointer-events-none fixed inset-x-4 bottom-20 z-[60] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-4 sm:items-end md:bottom-6">
        {toasts.map((t) => {
          const tone = TONE[t.variant];
          return (
            <div
              key={t.id}
              role="status"
              className={`glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-control border border-outline-variant border-l-[3px] ${tone.rule} px-4 py-3 shadow-overlay`}
            >
              <Icon name={tone.icon} size={20} className={`mt-0.5 shrink-0 ${tone.text}`} />
              <p className="min-w-0 flex-1 break-words text-sm text-on-surface">{t.message}</p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-on-surface-variant/70 transition hover:text-on-surface"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
