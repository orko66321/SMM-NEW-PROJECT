import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiErrorMessage } from "../../api/client.js";
import * as authApi from "../../api/auth.js";
import AuthShell from "../../components/auth/AuthShell.js";

export default function ForgotPassword() {
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
      setError(apiErrorMessage(err, "Something went wrong — please try again"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link to set a new password.">
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-md bg-success/15 px-3 py-2 text-sm text-success">
            If an account matches what you entered, a reset link is on its way. Check your inbox.
          </p>
          <Link to="/login" className="btn-primary block w-full text-center">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}
          <div>
            <label className="label" htmlFor="identifier">Username or Email</label>
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
            {submitting ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-center text-sm text-on-surface-variant">
            Remembered it? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
