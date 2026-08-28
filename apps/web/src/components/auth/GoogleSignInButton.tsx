import { useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { useToast } from "../ui/Toast.js";
import { getPublicSettings } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import AuthDivider from "./AuthDivider.js";

/**
 * Self-contained — reused identically on Login and Register (a Google
 * sign-in is a sign-up too, there's no separate step). Renders nothing at
 * all, rather than a button that always errors, whenever either half of
 * the config is missing:
 *   - VITE_GOOGLE_CLIENT_ID unset → main.tsx never even mounts
 *     GoogleOAuthProvider, so nothing here could render <GoogleLogin> safely.
 *   - the backend hasn't configured GOOGLE_CLIENT_ID/SECRET
 *     (settings.googleAuthEnabled) → submitting a credential would just 400.
 * Both must be true for the button (and its divider) to appear — see
 * .env.example.
 */
export default function GoogleSignInButton() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { t, lang } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 60_000 });

  // The Google-provided button renders in a cross-origin iframe sized by a
  // pixel `width` prop — it can't be styled responsively with CSS. Measure
  // the wrapper so the button always fits the card, down to a 320px
  // viewport, instead of overflowing/clipping at a hard-coded width.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState(320);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setButtonWidth(Math.max(200, Math.min(320, Math.floor(el.clientWidth))));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId || !settings?.googleAuthEnabled) return null;

  async function onSuccess(credential: { credential?: string }) {
    if (!credential.credential) {
      toast.push(t("auth.google.failedToast"), "error");
      return;
    }
    setSubmitting(true);
    try {
      await loginWithGoogle(credential.credential);
      toast.push(t("auth.google.welcomeToast"), "success");
      // Same "return to what you were doing" behavior as Login.tsx's
      // password path — a guest who reached /login via a Place Order /
      // new ticket prompt and signs in with Google should still land back
      // there, not get bounced to the generic dashboard.
      const from = (location.state as { from?: Location })?.from?.pathname;
      navigate(from ?? "/dashboard", { replace: true });
    } catch (err) {
      toast.push(apiErrorMessage(err, t("auth.google.failedToast")), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <AuthDivider />
      <div
        ref={wrapperRef}
        className={`flex w-full justify-center ${submitting ? "pointer-events-none opacity-60" : ""}`}
      >
        <GoogleLogin
          theme="filled_black"
          shape="pill"
          size="large"
          text="continue_with"
          locale={lang === "bn" ? "bn" : "en"}
          width={String(buttonWidth)}
          onSuccess={onSuccess}
          onError={() => toast.push(t("auth.google.failedToast"), "error")}
        />
      </div>
    </div>
  );
}
