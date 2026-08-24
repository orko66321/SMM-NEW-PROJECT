// Shared "OR CONTINUE WITH" divider between the password form and
// GoogleSignInButton on Login/Register — a plain div, not gated on
// Google being configured, since GoogleSignInButton already renders
// nothing when it isn't; keeping the divider itself simple avoids two
// components needing to agree on the same condition.
export default function AuthDivider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-outline-variant" />
      <span className="text-xs uppercase tracking-wide text-on-surface-variant">or continue with</span>
      <div className="h-px flex-1 bg-outline-variant" />
    </div>
  );
}
