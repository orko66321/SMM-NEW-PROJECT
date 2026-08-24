import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiErrorMessage } from "../../api/client.js";
import * as authApi from "../../api/auth.js";
import { useToast } from "../../components/ui/Toast.js";
import AuthShell from "../../components/auth/AuthShell.js";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await authApi.resetPassword({ token, password });
      toast.push("Password updated — please sign in.", "success");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "This reset link is invalid or has expired"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title="Reset your password" subtitle="This link is missing its reset token.">
        <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error">
          Open the link from your email again, or request a new one.
        </p>
        <Link to="/forgot-password" className="btn-primary mt-4 block w-full text-center">Request a new link</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password you haven't used before.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}
        <div>
          <label className="label" htmlFor="password">New password</label>
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
            At least 10 characters, with uppercase, lowercase, and a number.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm password</label>
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
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}
