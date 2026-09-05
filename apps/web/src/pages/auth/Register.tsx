import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiErrorMessage } from "../../api/client.js";
import * as authApi from "../../api/auth.js";
import { useToast } from "../../components/ui/Toast.js";
import { useLanguage } from "../../context/LanguageContext.js";
import AuthShell from "../../components/auth/AuthShell.js";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton.js";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { t } = useLanguage();
  const refFromUrl = new URLSearchParams(location.search).get("ref")?.trim() ?? "";
  const [form, setForm] = useState({ username: "", email: "", password: "", referralCode: refFromUrl });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await authApi.register({
        username: form.username,
        email: form.email,
        password: form.password,
        ...(form.referralCode.trim() ? { referralCode: form.referralCode.trim() } : {}),
      });
      toast.push(t("auth.register.createdToast"), "success");
      // Forward the "where to return to" state so a guest who arrived here
      // via a Place Order / new ticket prompt still lands back where they
      // started once they log in with the account they just created.
      navigate("/login", { replace: true, state: location.state });
    } catch (err) {
      setError(apiErrorMessage(err, t("auth.register.failedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title={t("auth.register.title")} subtitle={t("auth.register.subtitle")}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="rounded-control border border-error/30 bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}
        <div>
          <label className="label" htmlFor="username">{t("auth.register.usernameLabel")}</label>
          <input
            id="username"
            className="input-field"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="email">{t("auth.register.emailLabel")}</label>
          <input
            id="email"
            type="email"
            className="input-field"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">{t("auth.register.passwordLabel")}</label>
          <input
            id="password"
            type="password"
            className="input-field"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
          <p className="mt-1 text-xs text-on-surface-variant">
            {t("auth.register.passwordHint")}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="referralCode">
            {t("auth.register.referralLabel")} <span className="normal-case text-on-surface-variant">({t("common.optional")})</span>
          </label>
          <input
            id="referralCode"
            className="input-field"
            value={form.referralCode}
            onChange={(e) => setForm((f) => ({ ...f, referralCode: e.target.value.toUpperCase() }))}
            placeholder={t("auth.register.referralPlaceholder")}
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? t("auth.register.submitting") : t("auth.register.submit")}
        </button>
        <p className="text-center text-sm text-on-surface-variant">
          {t("auth.register.haveAccount")} <Link to="/login" className="text-primary hover:underline">{t("common.signIn")}</Link>
        </p>
      </form>
      <GoogleSignInButton />
    </AuthShell>
  );
}
