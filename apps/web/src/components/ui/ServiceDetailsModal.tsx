import { useEffect, type ReactNode } from "react";

export interface ServiceDetailsData {
  name: string;
  description: string | null;
  sellPricePer1000: string;
  minQuantity: number;
  maxQuantity: number;
  refillEnabled: boolean;
  cancelEnabled: boolean;
  providerServiceId?: string | null;
  platform?: string;
  category?: string;
}

// Same off-canvas-overlay pattern as DashboardLayout's mobile drawer (fixed
// inset-0 + backdrop-blur + body scroll lock) — reused here instead of
// pulling in a dialog library for one component.
export default function ServiceDetailsModal({
  service,
  onClose,
  footer,
}: {
  service: ServiceDetailsData;
  onClose: () => void;
  footer?: ReactNode;
}) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`${service.name} details`}>
      <div className="absolute inset-0 bg-surface-deep/70 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-xl border border-outline-variant bg-surface-container shadow-2xl sm:max-w-lg sm:rounded-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-outline-variant px-5 py-4">
          <div className="min-w-0">
            {(service.platform || service.category) && (
              <p className="text-xs uppercase tracking-wide text-on-surface-variant">
                {service.platform}{service.platform && service.category ? " · " : ""}{service.category}
              </p>
            )}
            <h2 className="text-base font-bold leading-snug text-on-surface sm:text-lg">{service.name}</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {service.providerServiceId && (
            <span className="badge mb-3 bg-surface-container-high font-mono text-[11px] text-on-surface-variant">
              ID {service.providerServiceId}
            </span>
          )}

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md bg-surface-container-high px-3 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-on-surface-variant">Price / 1000</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold text-success">${service.sellPricePer1000}</dd>
            </div>
            <div className="rounded-md bg-surface-container-high px-3 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-on-surface-variant">Min order</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold">{service.minQuantity.toLocaleString()}</dd>
            </div>
            <div className="rounded-md bg-surface-container-high px-3 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-on-surface-variant">Max order</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold">{service.maxQuantity.toLocaleString()}</dd>
            </div>
            <div className="rounded-md bg-surface-container-high px-3 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-on-surface-variant">Refill</dt>
              <dd className="mt-0.5 text-sm font-semibold">{service.refillEnabled ? "Yes" : "No refill"}</dd>
            </div>
          </dl>

          {!service.cancelEnabled && (
            <span className="badge mt-3 bg-outline-variant/40 text-on-surface-variant">No Cancel</span>
          )}

          {service.description ? (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">{service.description}</p>
          ) : (
            <p className="mt-4 text-sm text-on-surface-variant">No additional details provided for this service.</p>
          )}
        </div>

        {footer && <div className="shrink-0 border-t border-outline-variant px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
