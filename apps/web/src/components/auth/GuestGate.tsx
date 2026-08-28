import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext.js";

// Guest-browsing model: /dashboard is reachable without a session (see
// App.tsx — no ProtectedRoute wrapper any more). Pages that show personal
// data (Order History, Wallet, Tickets, Profile) render this in place of
// their real content when `!user`; pages with a single transactional CTA
// (New Order's "Place Order", Tickets' "Submit") instead call the write
// action directly and open <AuthPromptModal> only if that turns out to need
// a session — browsing/filling the form stays fully open to guests either
// way. Both paths land on the same /login /register routes with
// `state: { from: location }`, which Login.tsx/Register.tsx already read to
// bounce back to wherever the guest was, per the existing "from" convention
// used by AdminRoute/ProtectedRoute-style redirects elsewhere in this app.

// Full-page inline lock — used when a whole page is personal data with
// nothing guest-safe to show (Order History, Wallet, Profile, a single
// Ticket thread).
export function GuestLockedCard({ title, body }: { title: string; body: string }) {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <div className="card mx-auto max-w-md space-y-4 text-center">
      <h1 className="text-lg font-bold text-on-surface">{title}</h1>
      <p className="text-sm text-on-surface-variant">{body}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link to="/login" state={{ from: location }} className="btn-primary flex-1 justify-center">
          {t("common.signIn")}
        </Link>
        <Link to="/register" state={{ from: location }} className="btn-ghost flex-1 justify-center border border-outline-variant">
          {t("common.signUp")}
        </Link>
      </div>
    </div>
  );
}

// Choice modal — used when a guest triggers a write action from a page
// that's otherwise fully browsable (New Order's "Place Order", Tickets'
// "Submit new ticket"). Deliberately two explicit buttons rather than one
// generic "Login" — a first-time visitor doesn't yet have an account to log
// into.
export function AuthPromptModal({
  open,
  onClose,
  title,
  body,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
}) {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-deep/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="card w-full max-w-sm space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-on-surface">{title}</h2>
        <p className="text-sm text-on-surface-variant">{body}</p>
        <div className="flex flex-col gap-2">
          <Link to="/login" state={{ from: location }} className="btn-primary w-full justify-center">
            {t("common.signIn")}
          </Link>
          <Link to="/register" state={{ from: location }} className="btn-ghost w-full justify-center border border-outline-variant">
            {t("common.signUp")}
          </Link>
        </div>
        <button type="button" onClick={onClose} className="text-xs text-on-surface-variant hover:underline">
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
