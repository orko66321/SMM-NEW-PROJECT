import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

export function FullPageSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

// Client-side gating is a UX convenience only — the real authorization
// boundary is the server's `requireRole("ADMIN")` middleware on every
// /api/admin/* route (see apps/api/src/middleware/auth.ts). Even if this
// check were somehow bypassed, every admin API call still enforces RBAC
// independently.
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (user) {
    // Same "from" this route's Login/Register pages already read (see
    // Login.tsx's onSubmit, GoogleSignInButton.tsx, Register.tsx). Without
    // this, a guest who arrived at /login via a Place Order / locked-page
    // prompt (state: { from }) would win a redirect race against this
    // component's own effect: setUser(...) from a successful login
    // re-renders GuestRoute (still mounted on /login) before the login
    // page's own explicit navigate(from) call takes effect, and whichever
    // one lands last wins — this makes both agree on the same destination
    // instead of one silently overriding the other back to a bare /dashboard.
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    return <Navigate to={from ?? (user.role === "ADMIN" ? "/admin" : "/dashboard")} replace />;
  }
  return <>{children}</>;
}
