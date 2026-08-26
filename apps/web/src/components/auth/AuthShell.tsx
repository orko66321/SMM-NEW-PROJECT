import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../Logo.js";

// Shared glassmorphism chrome for every auth page (Login, Register,
// ForgotPassword, ResetPassword) — a radial-gradient glow behind a
// backdrop-blurred card, layered entirely from existing Tailwind tokens
// (see tailwind.config.js) so no new design tokens were needed.
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:py-12">
      <div
        className="pointer-events-none absolute -top-1/3 left-1/2 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #6D28D9 0%, transparent 65%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[30rem] w-[30rem] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #8B5CF6 0%, transparent 65%)" }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-sm">
        <Link to="/" className="mb-6 flex items-center justify-center sm:mb-8">
          <Logo size="lg" />
        </Link>

        <div className="w-full rounded-xl border border-outline-variant/60 bg-surface-container/60 p-5 shadow-2xl shadow-primary/10 backdrop-blur-xl sm:p-8">
          <h1 className="text-xl font-bold text-on-surface sm:text-2xl">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-on-surface-variant">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
