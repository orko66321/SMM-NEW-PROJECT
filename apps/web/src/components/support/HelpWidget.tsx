import { useEffect, useRef, useState, type RefObject } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import type { PublicSupportChannel, SupportChannelType } from "@smm/shared";
import { createTicket, getPublicSupportChannels } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { cn } from "../ds/cn.js";
import { TicketForm, type TicketFormValue } from "../tickets/TicketForm.js";

// Brand glyphs kept local to the widget — these are third-party logos, not
// part of the design-system Icon set. `bg` is the brand colour for the
// channel's circle; CUSTOM / TICKET fall back to the site's primary violet.
const GLYPHS: Record<SupportChannelType, { bg: string; path: string }> = {
  WHATSAPP: {
    bg: "#25D366",
    path: "M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7C17.17 3.03 14.68 2 12.04 2zm5.52 11.94c-.25.7-1.45 1.36-2 1.42-.53.06-1.03.28-3.47-.72-2.93-1.18-4.79-4.16-4.94-4.36-.14-.2-1.18-1.57-1.18-3s.75-2.12 1.02-2.41c.27-.29.58-.36.78-.36l.56.01c.18.01.42-.07.66.5.25.6.84 2.07.91 2.22.07.15.12.32.02.52-.1.2-.15.32-.29.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.35 1.45.29.15.46.12.63-.07.17-.2.73-.85.93-1.14.2-.29.39-.24.66-.14.27.1 1.71.81 2 .95.29.15.49.22.56.34.07.12.07.7-.18 1.4z",
  },
  TELEGRAM: {
    bg: "#229ED9",
    path: "M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.24-.42.43-.83.42z",
  },
  MESSENGER: {
    bg: "#0084FF",
    path: "M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.44 3.14 7.19.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.99-.88c.2-.09.42-.1.63-.05.9.25 1.87.38 2.87.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm6 7.46l-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.62l2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75c.21.16.5.16.72.01l3.16-2.39c.42-.32.97.18.69.62z",
  },
  CUSTOM: {
    bg: "",
    path: "M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-4.29 3.71A1 1 0 0 1 3 21V6a2 2 0 0 1 2-2z",
  },
  TICKET: {
    bg: "",
    path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3.5a2.5 2.5 0 0 1 2.5 2.5c0 1.1-.6 1.68-1.35 2.36-.6.55-.9.86-1 1.64h-2c0-1.35.5-2.05 1.32-2.79.6-.55.93-.9.93-1.21A1.4 1.4 0 0 0 12 6.6a1.4 1.4 0 0 0-1.4 1.4H8.6A3.4 3.4 0 0 1 12 5.5zM11 15h2v2h-2z",
  },
};

function ChannelIcon({ type }: { type: SupportChannelType }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 md:h-6 md:w-6">
      <path d={GLYPHS[type].path} />
    </svg>
  );
}

// Support headset — the collapsed launcher icon (matches the approved design).
function HeadsetIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M20 15.5a2.5 2.5 0 0 1-2.5 2.5H17a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h1.5A2.5 2.5 0 0 1 21 14z" />
      <path d="M4 15.5A2.5 2.5 0 0 0 6.5 18H7a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H5.5A2.5 2.5 0 0 0 3 14z" />
      <path d="M20 18v1a3 3 0 0 1-3 3h-3" />
    </svg>
  );
}

/**
 * Floating "Need Help?" launcher. Replaces the old single WhatsApp button.
 * The channel list is fully dynamic — it comes from
 * GET /api/public/support-channels, which only ever returns channels an
 * admin toggled on (Admin → Support Channels), with the outbound URL
 * already built server-side. Renders nothing when the list is empty.
 */
export default function HelpWidget() {
  const location = useLocation();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  const { data: channels = [] } = useQuery<PublicSupportChannel[]>({
    queryKey: ["public-support-channels"],
    queryFn: getPublicSupportChannels,
    staleTime: 60_000,
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Hidden inside the admin panel — it would overlap the admin bottom nav
  // and the operator isn't the audience for it.
  if (location.pathname.startsWith("/admin")) return null;
  if (channels.length === 0) return null;

  // Nearest-to-the-button item animates in first on open, out last on close.
  const stagger = (i: number) => (open ? (channels.length - 1 - i) * 45 : i * 35);

  function isBranded(type: SupportChannelType) {
    return type === "WHATSAPP" || type === "TELEGRAM" || type === "MESSENGER";
  }

  return (
    <>
      {/* Scrim — dims the page so the expanded tray reads as an overlay,
          not broken UI floating over content. Also the tap-away catcher.
          Kept mounted so it can fade. */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 cursor-default bg-surface-deep/50 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div className="fixed bottom-20 right-5 z-50 flex flex-col items-end gap-3.5 md:bottom-7 md:right-8 md:gap-4">
        {/* Channel tray */}
        <ul className={cn("flex flex-col items-end gap-3 md:gap-3.5", !open && "pointer-events-none")}>
          {channels.map((channel, i) => {
            const label = channel.label;
            const circleClass = cn(
              "help-channel relative flex h-12 w-12 items-center justify-center rounded-full text-white md:h-14 md:w-14",
              "transition-transform duration-200 ease-ds hover:scale-110",
              !isBranded(channel.type) && "bg-primary",
            );
            const circleStyle = isBranded(channel.type) ? { backgroundColor: GLYPHS[channel.type].bg } : undefined;
            const hoverLabel = (
              <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-full bg-surface-card/95 px-3 py-1.5 text-sm font-medium text-on-surface opacity-0 shadow-raised ring-1 ring-white/10 backdrop-blur transition-opacity duration-150 group-hover:opacity-100">
                {label}
              </span>
            );
            const itemClass = cn(
              "group flex items-center justify-end transition-all duration-300 ease-ds",
              open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-90 opacity-0",
            );
            return (
              <li key={channel.type} style={{ transitionDelay: `${stagger(i)}ms` }} className={itemClass} aria-hidden={!open}>
                {channel.type === "TICKET" ? (
                  <button
                    type="button"
                    tabIndex={open ? 0 : -1}
                    aria-label={t("helpWidget.openTicket")}
                    title={t("helpWidget.openTicket")}
                    className={cn(circleClass, "focus:outline-none focus-visible:ring-2 focus-visible:ring-white")}
                    style={circleStyle}
                    onClick={() => {
                      setTicketOpen(true);
                      setOpen(false);
                    }}
                  >
                    {hoverLabel}
                    <ChannelIcon type={channel.type} />
                  </button>
                ) : (
                  <a
                    href={channel.href ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={open ? 0 : -1}
                    aria-label={label}
                    title={label}
                    className={cn(circleClass, "focus:outline-none focus-visible:ring-2 focus-visible:ring-white")}
                    style={circleStyle}
                    onClick={() => setOpen(false)}
                  >
                    {hoverLabel}
                    <ChannelIcon type={channel.type} />
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        {/* Launcher — one toggle control. The "Need help?" label is a
            hover / focus reveal, so the resting footprint is just the button
            itself and never sits on top of page text (any breakpoint).
            Size steps up from 56px on mobile to 64px at md+. */}
        <button
          ref={fabRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? t("helpWidget.close") : t("helpWidget.open")}
          className="group/fab flex items-center rounded-full outline-none transition-transform duration-300 ease-ds hover:scale-[1.03] active:scale-95"
        >
          <span
            className={cn(
              "pointer-events-none flex max-w-0 items-center overflow-hidden opacity-0 transition-all duration-300 ease-ds",
              !open &&
                "group-hover/fab:max-w-[220px] group-hover/fab:opacity-100 group-focus-visible/fab:max-w-[220px] group-focus-visible/fab:opacity-100",
            )}
          >
            <span className="mr-3 whitespace-nowrap rounded-full bg-surface-card/95 px-4 py-2.5 text-sm font-semibold text-on-surface shadow-overlay ring-1 ring-white/10 backdrop-blur">
              {t("helpWidget.open")}
            </span>
          </span>

          <span
            className={cn(
              "help-fab relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white md:h-16 md:w-16",
              "ring-4 ring-transparent transition-shadow duration-300 group-focus-visible/fab:ring-primary/40",
              open && "help-fab--open",
            )}
          >
            <span className={cn("absolute transition-all duration-300 ease-ds", open ? "scale-50 opacity-0" : "scale-100 opacity-100")}>
              <HeadsetIcon className="h-6 w-6 md:h-7 md:w-7" />
            </span>
            <span className={cn("absolute transition-all duration-300 ease-ds", open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className="h-5 w-5 md:h-6 md:w-6">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </span>
          </span>
        </button>
      </div>

      {ticketOpen && <SupportTicketPopover onClose={() => setTicketOpen(false)} returnFocusRef={fabRef} />}
    </>
  );
}

/**
 * Compact "open a support ticket" panel launched from the widget — renders
 * the SAME `<TicketForm>` the /dashboard/tickets card uses (Category → AI vs
 * Human Support → subcategory + order IDs / message), so a customer can file
 * a ticket without leaving the page. Bottom sheet on mobile, anchored bottom-
 * right on desktop. Scrim + Esc + click-outside close it; focus is trapped
 * while open and restored to the launcher on close.
 */
function SupportTicketPopover({
  onClose,
  returnFocusRef,
}: {
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const { t } = useLanguage();
  const toast = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const launcher = returnFocusRef.current;

    const focusables = () =>
      panelRef.current
        ? Array.from(
            panelRef.current.querySelectorAll<HTMLElement>(
              'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null)
        : [];

    focusables()[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      launcher?.focus?.();
    };
  }, [onClose, returnFocusRef]);

  async function submit(value: TicketFormValue) {
    setSubmitting(true);
    setError(null);
    try {
      await createTicket(value);
      toast.push(t("helpWidget.submittedToast"), "success");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, t("helpWidget.failedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="hw-ticket-title">
      <div className="absolute inset-0 bg-surface-deep/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        className={cn(
          "glass absolute flex max-h-[85vh] flex-col overflow-hidden border border-outline-variant shadow-overlay",
          "inset-x-0 bottom-0 rounded-t-card",
          "sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[384px] sm:max-w-[calc(100vw-3rem)] sm:rounded-card",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-outline-variant px-5 py-4">
          <h2 id="hw-ticket-title" className="text-base font-bold text-on-surface">
            {t("helpWidget.ticketModalTitle")}
          </h2>
          <button
            type="button"
            aria-label={t("helpWidget.close")}
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="aio-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!user ? (
            <div className="space-y-4">
              <p className="text-sm text-on-surface-variant">{t("helpWidget.signInPrompt")}</p>
              <Link to="/login" onClick={onClose} className="btn-primary inline-flex w-full justify-center">
                {t("helpWidget.signIn")}
              </Link>
            </div>
          ) : (
            <TicketForm
              idPrefix="hw-ticket"
              onSubmit={submit}
              submitting={submitting}
              error={error}
              submitLabel={t("helpWidget.submit")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
