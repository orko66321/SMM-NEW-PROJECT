import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "../api/resources.js";
import { useLanguage } from "../context/LanguageContext.js";
import { Icon } from "./ds/Icon.js";

// Admin-configured announcement popup (Site Settings → "Announcement Modal").
// Mounted once in App.tsx. Shows at most once per browser session: the
// sessionStorage key holds a hash of the current content, so a *new*
// announcement re-appears but internal navigation / repeat visits within the
// session do not re-trigger it.

const SEEN_KEY = "smm_announcement_seen";

interface AnnouncementSettings {
  modalEnabled?: boolean;
  modalBannerImage?: string | null;
  modalText?: string | null;
  modalButtonText?: string | null;
  modalButtonLink?: string | null;
}

/** Cheap stable hash so a changed announcement counts as "not seen yet". */
function hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function readSeen(): string | null {
  try {
    return sessionStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

export default function AnnouncementModal() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data } = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 60_000 });

  const [dismissed, setDismissed] = useState(false);

  const s = data as AnnouncementSettings | undefined;
  const bannerImage = s?.modalBannerImage?.trim() || "";
  const text = s?.modalText?.trim() || "";
  const buttonText = s?.modalButtonText?.trim() || "";
  const buttonLink = s?.modalButtonLink?.trim() || "";

  const active = !!s?.modalEnabled && (!!text || !!bannerImage) && !pathname.startsWith("/admin");
  const contentHash = active ? hash(`${bannerImage.length}|${text}|${buttonText}|${buttonLink}`) : "";
  const open = active && !dismissed && readSeen() !== contentHash;

  const close = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(SEEN_KEY, contentHash);
    } catch {
      // per-session convenience only — safe to no-op if storage is blocked
    }
  }, [contentHash]);

  // Body scroll-lock + Esc-to-close while the modal is open (same as ds/Modal).
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!open) return null;

  function onAction() {
    close();
    if (!buttonLink) return;
    if (buttonLink.startsWith("/")) {
      navigate(buttonLink);
    } else {
      window.location.href = buttonLink;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("common.announcement")}
    >
      <div className="absolute inset-0 bg-surface-deep/70 backdrop-blur-[12px]" onClick={close} aria-hidden />

      <div className="glass relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-card border border-outline-variant shadow-overlay sm:rounded-card">
        <button
          type="button"
          aria-label={t("common.close")}
          onClick={close}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface-deep/60 text-white backdrop-blur transition hover:bg-surface-deep/80"
        >
          <Icon name="close" size={18} />
        </button>

        {bannerImage && (
          <img
            src={bannerImage}
            alt=""
            className="max-h-52 w-full shrink-0 object-cover"
          />
        )}

        {text && (
          <div className="aio-scroll min-h-0 flex-1 overflow-y-auto whitespace-pre-line px-5 py-5 text-sm leading-relaxed text-on-surface">
            {text}
          </div>
        )}

        {buttonText && (
          <div className="shrink-0 border-t border-outline-variant px-5 py-4">
            <button type="button" className="btn-primary w-full" onClick={onAction}>
              {buttonText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
