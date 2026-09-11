import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateMyProfile } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { Modal } from "../ds/index.js";

// Bangladeshi mobile format the rest of the panel assumes (see
// apps/api/src/lib/sms.ts's normalizeBdPhone) — 11 digits, local 0-prefixed
// form, operator prefix 013–019.
export const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

const DISMISSED_KEY = "smm_phone_prompt_dismissed";

/** True once this browser session has already clicked "Remind me later". */
export function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * One-time onboarding modal for an account with no phone number on file —
 * mounted in DashboardLayout, shown only when `user` exists and
 * `user.phone` is falsy. Mainly hits Google sign-ups (Google never provides
 * a phone number), but applies to any account that never set one.
 *
 * "Remind me later" is a per-browser-session dismissal (sessionStorage,
 * same pattern as AnnouncementModal.tsx) — it reappears on the next visit
 * rather than being gone forever, since the underlying gap (no phone, so no
 * order/deposit SMS) is still there. Saving a phone removes the trigger
 * itself (`user.phone` becomes truthy), which is the only permanent dismissal.
 */
export default function PhoneOnboardingModal() {
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { setUserPhone } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (dismissed || readDismissed()) return null;

  function remindLater() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // per-session convenience only — safe to no-op if storage is blocked
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!BD_PHONE_REGEX.test(trimmed)) {
      setError(t("phoneOnboarding.invalidFormat"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updateMyProfile({ phone: trimmed });
      setUserPhone(trimmed);
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast.push(t("phoneOnboarding.savedToast"), "success");
      setDismissed(true);
    } catch (err) {
      setError(apiErrorMessage(err, t("phoneOnboarding.saveFailedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={t("phoneOnboarding.title")} onClose={remindLater} size="sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-on-surface-variant">{t("phoneOnboarding.message")}</p>
        <div>
          <label className="label" htmlFor="onboarding-phone">
            {t("phoneOnboarding.inputLabel")}
          </label>
          <input
            id="onboarding-phone"
            type="tel"
            inputMode="numeric"
            autoFocus
            className="input-field"
            placeholder={t("phoneOnboarding.placeholder")}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11));
              setError(null);
            }}
            required
          />
          {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button type="submit" className="btn-primary flex-1" disabled={submitting}>
            {submitting ? t("phoneOnboarding.saving") : t("phoneOnboarding.save")}
          </button>
          <button type="button" className="btn-ghost" onClick={remindLater}>
            {t("phoneOnboarding.remindLater")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
