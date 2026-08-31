import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
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
// ADMIN and MODERATOR both reach the admin panel; MODERATOR is scoped down
// per-route on the server (routes/admin/index.ts) and per-nav-item in
// AdminLayout. This client check is a UX convenience only.
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN" && user.role !== "MODERATOR") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// Layout route for the admin pages a MODERATOR must not see (settings,
// catalogue, gateways, …). The server rejects those endpoints regardless
// (routes/admin/index.ts `adminOnly`); this keeps a moderator from landing
// on a page they can't use. Bounces them back to the admin dashboard.
export function AdminOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/admin" replace />;
  return <Outlet />;
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
    const home = user.role === "ADMIN" || user.role === "MODERATOR" ? "/admin" : "/dashboard";
    return <Navigate to={from ?? home} replace />;
  }
  return <>{children}</>;
}
