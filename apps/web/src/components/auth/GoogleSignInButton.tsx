import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext.js";
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
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 60_000 });

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId || !settings?.googleAuthEnabled) return null;

  async function onSuccess(credential: { credential?: string }) {
    if (!credential.credential) {
      toast.push("Google sign-in failed", "error");
      return;
    }
    setSubmitting(true);
    try {
      await loginWithGoogle(credential.credential);
      toast.push("Welcome!", "success");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Google sign-in failed"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <AuthDivider />
      <div className={`flex justify-center ${submitting ? "pointer-events-none opacity-60" : ""}`}>
        <GoogleLogin
          theme="filled_black"
          shape="pill"
          size="large"
          text="continue_with"
          width="320"
          onSuccess={onSuccess}
          onError={() => toast.push("Google sign-in failed", "error")}
        />
      </div>
    </div>
  );
}
