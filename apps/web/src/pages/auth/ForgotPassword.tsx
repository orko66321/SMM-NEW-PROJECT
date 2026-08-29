import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiErrorMessage } from "../../api/client.js";
import * as authApi from "../../api/auth.js";
import { useLanguage } from "../../context/LanguageContext.js";
import AuthShell from "../../components/auth/AuthShell.js";

export default function ForgotPassword() {
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await authApi.forgotPassword({ identifier });
      // The API always returns 204 whether or not the account exists — see
      // passwordReset.service.ts. The UI mirrors that: never reveal which
      // one happened, so this message is always shown on success.
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err, t("auth.forgotPassword.failedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title={t("auth.forgotPassword.title")} subtitle={t("auth.forgotPassword.subtitle")}>
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-md bg-success/15 px-3 py-2 text-sm text-success">
            {t("auth.forgotPassword.sentMessage")}
          </p>
          <Link to="/login" className="btn-primary block w-full text-center">{t("auth.forgotPassword.backToSignIn")}</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="rounded-control border border-error/30 bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}
          <div>
            <label className="label" htmlFor="identifier">{t("auth.forgotPassword.identifierLabel")}</label>
            <input
              id="identifier"
              className="input-field"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? t("auth.forgotPassword.submitting") : t("auth.forgotPassword.submit")}
          </button>
          <p className="text-center text-sm text-on-surface-variant">
            {t("auth.forgotPassword.rememberedIt")} <Link to="/login" className="text-primary hover:underline">{t("common.signIn")}</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
