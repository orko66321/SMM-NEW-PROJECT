import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiErrorMessage } from "../../api/client.js";
import * as authApi from "../../api/auth.js";
import { useToast } from "../../components/ui/Toast.js";
import { useLanguage } from "../../context/LanguageContext.js";
import AuthShell from "../../components/auth/AuthShell.js";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("auth.resetPassword.passwordsDontMatch"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await authApi.resetPassword({ token, password });
      toast.push(t("auth.resetPassword.updatedToast"), "success");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, t("auth.resetPassword.failedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title={t("auth.resetPassword.missingTokenTitle")} subtitle={t("auth.resetPassword.missingTokenSubtitle")}>
        <p className="rounded-control border border-error/30 bg-error/15 px-3 py-2 text-sm text-error">
          {t("auth.resetPassword.missingTokenMessage")}
        </p>
        <Link to="/forgot-password" className="btn-primary mt-4 block w-full text-center">{t("auth.resetPassword.requestNewLink")}</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("auth.resetPassword.title")} subtitle={t("auth.resetPassword.subtitle")}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="rounded-control border border-error/30 bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}
        <div>
          <label className="label" htmlFor="password">{t("auth.resetPassword.newPasswordLabel")}</label>
          <input
            id="password"
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <p className="mt-1 text-xs text-on-surface-variant">
            {t("auth.resetPassword.passwordHint")}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="confirm">{t("auth.resetPassword.confirmLabel")}</label>
          <input
            id="confirm"
            type="password"
            className="input-field"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? t("auth.resetPassword.submitting") : t("auth.resetPassword.submit")}
        </button>
      </form>
    </AuthShell>
  );
}
