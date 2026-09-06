import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { AuthUser } from "@smm/shared";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../ui/Toast.js";
import GoogleSignInButton from "./GoogleSignInButton.js";

type Tab = "login" | "signup";

// Mirrors the server-side zod rules in packages/shared (usernameSchema /
// passwordSchema / loginSchema) so a bad field is caught before the request
// — the API still re-validates, this is just UX.
const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPassword = (v: string) =>
  v.length >= 10 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v);

// Role-based post-auth landing route — mirrors GuestRoute / PublicLayout,
// which make the same USER→/dashboard, staff→/admin choice.
function authHome(user: AuthUser) {
  return user.role === "ADMIN" || user.role === "MODERATOR" ? "/admin" : "/dashboard";
}

/**
 * Tabbed Login / Sign Up box. Embedded on the landing page hero
 * (pages/public/Landing.tsx) so a guest can authenticate without leaving
 * "/", but self-contained enough to drop anywhere.
 *
 * - Inline per-field validation + a form-level error row for API failures.
 * - Loading spinner on the submit button while the request is in flight.
 * - On success the auth context's `user` is set; the landing page's own
 *   session check then redirects to the dashboard. We also navigate here
 *   explicitly so the panel works standalone and honours a `state.from`
 *   deep-link return.
 * - Sign Up: the API's POST /auth/register only creates the account (no
 *   session), so on success we immediately log in with the same
 *   credentials to give the "auto-store token + redirect" behaviour.
 */
export default function AuthPanel({ defaultTab = "login" }: { defaultTab?: Tab }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { t } = useLanguage();
  const fieldId = useId();

  const [tab, setTab] = useState<Tab>(defaultTab);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const refFromUrl = new URLSearchParams(location.search).get("ref")?.trim().toUpperCase() ?? "";
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    username: "",
    email: "",
    password: "",
    referralCode: refFromUrl,
  });

  function switchTab(next: Tab) {
    setTab(next);
    setFormError(null);
    setFieldErrors({});
  }

  function clearFieldError(name: string) {
    setFieldErrors((e) => (e[name] ? { ...e, [name]: "" } : e));
  }

  function redirectAfterAuth(user: AuthUser) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    navigate(from ?? authHome(user), { replace: true });
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (loginForm.identifier.trim().length < 3) errs.identifier = t("auth.panel.invalidIdentifier");
    if (loginForm.password.length < 1) errs.password = t("auth.panel.passwordRequired");
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const user = await login({
        identifier: loginForm.identifier.trim(),
        password: loginForm.password,
      });
      toast.push(t("auth.login.welcomeToast"), "success");
      redirectAfterAuth(user);
    } catch (err) {
      setFormError(apiErrorMessage(err, t("auth.login.failedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSignup(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!USERNAME_RE.test(signupForm.username.trim())) errs.username = t("auth.panel.invalidUsername");
    if (!EMAIL_RE.test(signupForm.email.trim())) errs.email = t("auth.panel.invalidEmail");
    if (!strongPassword(signupForm.password)) errs.password = t("auth.panel.invalidPassword");
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const username = signupForm.username.trim();
    const password = signupForm.password;

    setSubmitting(true);
    setFormError(null);
    try {
      await register({
        username,
        email: signupForm.email.trim(),
        password,
        ...(signupForm.referralCode.trim() ? { referralCode: signupForm.referralCode.trim() } : {}),
      });

      // POST /auth/register doesn't open a session — log straight in so the
      // user lands on the dashboard rather than a second form.
      try {
        const user = await login({ identifier: username, password });
        toast.push(t("auth.login.welcomeToast"), "success");
        redirectAfterAuth(user);
      } catch {
        // Account exists but the follow-up login failed (e.g. rate limit) —
        // fall back to the login tab so they can retry manually.
        toast.push(t("auth.register.createdToast"), "success");
        setLoginForm({ identifier: username, password: "" });
        setSignupForm((f) => ({ ...f, password: "" }));
        setFormError(t("auth.panel.signedUpNeedsLogin"));
        setTab("login");
      }
    } catch (err) {
      setFormError(apiErrorMessage(err, t("auth.register.failedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "login", label: t("auth.panel.loginTab") },
    { id: "signup", label: t("auth.panel.signupTab") },
  ];

  return (
    <div className="card w-full shadow-ambient sm:p-6">
      {/* Segmented tab switcher */}
      <div role="tablist" aria-label={t("auth.panel.heading")} className="mb-5 grid grid-cols-2 gap-1 rounded-control bg-surface-container p-1">
        {tabs.map((it) => {
          const active = it.id === tab;
          return (
            <button
              key={it.id}
              role="tab"
              type="button"
              id={`${fieldId}-tab-${it.id}`}
              aria-selected={active}
              aria-controls={`${fieldId}-panel`}
              onClick={() => switchTab(it.id)}
              className={`min-h-[40px] rounded-control px-3 text-sm font-semibold transition duration-150 ease-ds ${
                active
                  ? "bg-primary text-on-primary shadow-ambient"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {it.label}
            </button>
          );
        })}
      </div>

      <div id={`${fieldId}-panel`} role="tabpanel" aria-labelledby={`${fieldId}-tab-${tab}`}>
        <p className="mb-4 text-sm text-on-surface-variant">
          {tab === "login" ? t("auth.panel.loginSubtitle") : t("auth.panel.signupSubtitle")}
        </p>

        {formError && (
          <p className="mb-4 rounded-control border border-error/30 bg-error/15 px-3 py-2 text-sm text-error" role="alert">
            {formError}
          </p>
        )}

        {tab === "login" ? (
          <form onSubmit={onLogin} className="space-y-4" noValidate>
            <Field
              id={`${fieldId}-identifier`}
              label={t("auth.login.identifierLabel")}
              autoComplete="username"
              value={loginForm.identifier}
              error={fieldErrors.identifier}
              onChange={(v) => {
                setLoginForm((f) => ({ ...f, identifier: v }));
                clearFieldError("identifier");
              }}
            />
            <Field
              id={`${fieldId}-login-password`}
              label={t("auth.login.passwordLabel")}
              type="password"
              autoComplete="current-password"
              value={loginForm.password}
              error={fieldErrors.password}
              onChange={(v) => {
                setLoginForm((f) => ({ ...f, password: v }));
                clearFieldError("password");
              }}
              trailingLabel={
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  {t("auth.login.forgotPassword")}
                </Link>
              }
            />
            <SubmitButton submitting={submitting} idle={t("auth.login.submit")} busy={t("auth.login.submitting")} />
          </form>
        ) : (
          <form onSubmit={onSignup} className="space-y-4" noValidate>
            <Field
              id={`${fieldId}-username`}
              label={t("auth.register.usernameLabel")}
              autoComplete="username"
              value={signupForm.username}
              error={fieldErrors.username}
              onChange={(v) => {
                setSignupForm((f) => ({ ...f, username: v }));
                clearFieldError("username");
              }}
            />
            <Field
              id={`${fieldId}-email`}
              label={t("auth.register.emailLabel")}
              type="email"
              autoComplete="email"
              value={signupForm.email}
              error={fieldErrors.email}
              onChange={(v) => {
                setSignupForm((f) => ({ ...f, email: v }));
                clearFieldError("email");
              }}
            />
            <Field
              id={`${fieldId}-signup-password`}
              label={t("auth.register.passwordLabel")}
              type="password"
              autoComplete="new-password"
              value={signupForm.password}
              error={fieldErrors.password}
              hint={t("auth.register.passwordHint")}
              onChange={(v) => {
                setSignupForm((f) => ({ ...f, password: v }));
                clearFieldError("password");
              }}
            />
            <Field
              id={`${fieldId}-referral`}
              label={`${t("auth.register.referralLabel")} (${t("common.optional")})`}
              placeholder={t("auth.register.referralPlaceholder")}
              value={signupForm.referralCode}
              onChange={(v) => setSignupForm((f) => ({ ...f, referralCode: v.toUpperCase() }))}
            />
            <SubmitButton submitting={submitting} idle={t("auth.register.submit")} busy={t("auth.register.submitting")} />
          </form>
        )}

        <GoogleSignInButton />
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  type = "text",
  autoComplete,
  placeholder,
  trailingLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  trailingLabel?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label" htmlFor={id}>{label}</label>
        {trailingLabel}
      </div>
      <input
        id={id}
        type={type}
        className={`input-field ${error ? "border-error focus:border-error focus:ring-error/40" : ""}`}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-xs text-error">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-on-surface-variant">{hint}</p>
      ) : null}
    </div>
  );
}

function SubmitButton({ submitting, idle, busy }: { submitting: boolean; idle: string; busy: string }) {
  return (
    <button type="submit" className="btn-primary w-full" disabled={submitting}>
      {submitting && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" aria-hidden />
      )}
      {submitting ? busy : idle}
    </button>
  );
}
