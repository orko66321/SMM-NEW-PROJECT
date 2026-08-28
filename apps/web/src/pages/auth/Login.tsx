import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import AuthShell from "../../components/auth/AuthShell.js";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton.js";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ identifier, password });
      toast.push(t("auth.login.welcomeToast"), "success");
      const from = (location.state as { from?: Location })?.from?.pathname;
      navigate(from ?? "/dashboard", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, t("auth.login.failedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title={t("auth.login.title")} subtitle={t("auth.login.subtitle")}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}
        <div>
          <label className="label" htmlFor="identifier">{t("auth.login.identifierLabel")}</label>
          <input
            id="identifier"
            className="input-field"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">{t("auth.login.passwordLabel")}</label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">{t("auth.login.forgotPassword")}</Link>
          </div>
          <input
            id="password"
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? t("auth.login.submitting") : t("auth.login.submit")}
        </button>
        <p className="text-center text-sm text-on-surface-variant">
          {t("auth.login.noAccount")} <Link to="/register" className="text-primary hover:underline">{t("common.signUp")}</Link>
        </p>
      </form>
      <GoogleSignInButton />
    </AuthShell>
  );
}
