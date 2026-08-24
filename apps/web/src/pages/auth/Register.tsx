import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiErrorMessage } from "../../api/client.js";
import * as authApi from "../../api/auth.js";
import { useToast } from "../../components/ui/Toast.js";
import AuthShell from "../../components/auth/AuthShell.js";

export default function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await authApi.register(form);
      toast.push("Account created — please sign in.", "success");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Registration failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Create an account" subtitle="Start ordering in minutes — no setup fees.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}
        <div>
          <label className="label" htmlFor="username">Username</label>
          <input
            id="username"
            className="input-field"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
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
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input-field"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
          <p className="mt-1 text-xs text-on-surface-variant">
            At least 10 characters, with uppercase, lowercase, and a number.
          </p>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Sign up"}
        </button>
        <p className="text-center text-sm text-on-surface-variant">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
