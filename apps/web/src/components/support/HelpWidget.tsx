import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import type { PublicSupportChannel, SupportChannelType } from "@smm/shared";
import { createTicket, getPublicSupportChannels } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { cn } from "../ds/cn.js";

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

function ChannelCircle({ channel, className, style }: { channel: PublicSupportChannel; className?: string; style?: CSSProperties }) {
  const glyph = GLYPHS[channel.type];
  const branded = channel.type === "WHATSAPP" || channel.type === "TELEGRAM" || channel.type === "MESSENGER";
  return (
    <span
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-raised ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-110",
        !branded && "bg-primary",
        className,
      )}
      style={{ ...(branded ? { backgroundColor: glyph.bg } : null), ...style }}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d={glyph.path} />
      </svg>
    </span>
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

  // Nearest-to-the-button item animates first on open, last on close.
  const stagger = (i: number) => (open ? (channels.length - 1 - i) * 40 : i * 30);

  return (
    <>
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 sm:right-5 md:bottom-6">
        <ul className={cn("flex flex-col items-end gap-3", !open && "pointer-events-none")}>
          {channels.map((channel, i) => {
            const label = channel.label;
            const inner: ReactNode = (
              <>
                <span className="rounded-full bg-surface-container/95 px-3 py-1.5 text-sm font-medium text-on-surface shadow-raised ring-1 ring-outline-variant/60 backdrop-blur">
                  {label}
                </span>
                <ChannelCircle channel={channel} />
              </>
            );
            const itemClass = cn(
              "group flex items-center gap-2.5 transition-all duration-300 ease-ds",
              open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-90 opacity-0",
            );
            return (
              <li
                key={channel.type}
                style={{ transitionDelay: `${stagger(i)}ms` }}
                className={itemClass}
                aria-hidden={!open}
              >
                {channel.type === "TICKET" ? (
                  <button
                    type="button"
                    tabIndex={open ? 0 : -1}
                    className="flex items-center gap-2.5"
                    onClick={() => {
                      setTicketOpen(true);
                      setOpen(false);
                    }}
                  >
                    {inner}
                  </button>
                ) : (
                  <a
                    href={channel.href ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={open ? 0 : -1}
                    className="flex items-center gap-2.5"
                    onClick={() => setOpen(false)}
                  >
                    {inner}
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? t("helpWidget.close") : t("helpWidget.open")}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-overlay ring-1 ring-black/10 transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            open && "rotate-90",
          )}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="h-6 w-6">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <>
                <path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </>
            )}
          </svg>
        </button>
      </div>

      {ticketOpen && <SupportTicketModal onClose={() => setTicketOpen(false)} />}
    </>
  );
}

function SupportTicketModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const toast = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTicket({ subject: subject.trim(), message: message.trim() });
      toast.push(t("helpWidget.submittedToast"), "success");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      onClose();
    } catch (err) {
      toast.push(apiErrorMessage(err, t("helpWidget.failedFallback")), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={t("helpWidget.ticketModalTitle")}>
      <div className="absolute inset-0 bg-surface-deep/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div ref={dialogRef} className="relative w-full max-w-md rounded-t-xl border border-outline-variant bg-surface-container p-5 shadow-2xl sm:rounded-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-base font-bold text-on-surface">{t("helpWidget.ticketModalTitle")}</h2>
          <button type="button" aria-label={t("helpWidget.close")} onClick={onClose} className="rounded-control p-1 text-on-surface-variant hover:bg-surface-container-highest">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
          </button>
        </div>

        {!user ? (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">{t("helpWidget.signInPrompt")}</p>
            <Link to="/login" onClick={onClose} className="btn-primary inline-flex w-full justify-center">
              {t("helpWidget.signIn")}
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="hw-subject">{t("helpWidget.subjectLabel")}</label>
              <input
                id="hw-subject"
                className="input-field"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                minLength={3}
                maxLength={200}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="hw-message">{t("helpWidget.messageLabel")}</label>
              <textarea
                id="hw-message"
                rows={4}
                className="input-field"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={5000}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? t("helpWidget.submitting") : t("helpWidget.submit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
