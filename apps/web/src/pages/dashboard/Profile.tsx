import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeMyPassword,
  generateMyApiKey,
  getMyProfile,
  revokeMyApiKey,
  updateMyProfile,
} from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { GuestLockedCard } from "../../components/auth/GuestGate.js";
import { BilingualNote, Icon } from "../../components/ds/index.js";

interface Profile {
  username: string;
  email: string;
  phone: string | null;
  notifyEmail: boolean;
  notifyOrderUpdates: boolean;
  notifyPromotions: boolean;
  apiKeyPrefix: string | null;
  apiKeyCreatedAt: string | null;
  avatarUrl: string | null;
  hasPassword: boolean;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore silently
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      title={copied ? t("common.copied") : label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
    >
      <Icon name={copied ? "check" : "copy"} size={18} className={copied ? "text-success" : undefined} />
    </button>
  );
}

function ProfileDetailsCard({ profile }: { profile: Profile }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [notifyEmail, setNotifyEmail] = useState(profile.notifyEmail);
  const [notifyOrderUpdates, setNotifyOrderUpdates] = useState(profile.notifyOrderUpdates);
  const [notifyPromotions, setNotifyPromotions] = useState(profile.notifyPromotions);
  const [submitting, setSubmitting] = useState(false);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateMyProfile({ phone: phone || null, notifyEmail, notifyOrderUpdates, notifyPromotions });
      toast.push(t("profile.updatedToast"), "success");
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, t("profile.updateFailedFallback")), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSave} className="card space-y-4">
      <div className="flex items-center gap-3">
        {profile.avatarUrl && (
          <img src={profile.avatarUrl} alt="" className="h-10 w-10 rounded-full border border-outline-variant" referrerPolicy="no-referrer" />
        )}
        <h2 className="text-lg font-bold">{t("profile.accountDetails")}</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">{t("profile.usernameLabel")}</label>
          <input className="input-field" value={profile.username} disabled />
        </div>
        <div>
          <label className="label">{t("profile.emailLabel")}</label>
          <input className="input-field" value={profile.email} disabled />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="phone">{t("profile.phoneLabel")}</label>
        <input id="phone" className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801700000000" />
      </div>

      <div className="space-y-2 border-t border-outline-variant pt-4">
        <p className="label">{t("profile.notificationPrefs")}</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} /> {t("profile.notifyEmail")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notifyOrderUpdates} onChange={(e) => setNotifyOrderUpdates(e.target.checked)} /> {t("profile.notifyOrderUpdates")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notifyPromotions} onChange={(e) => setNotifyPromotions(e.target.checked)} /> {t("profile.notifyPromotions")}
        </label>
      </div>

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? t("profile.saving") : t("profile.saveChanges")}
      </button>
    </form>
  );
}

function ChangePasswordCard({ hasPassword }: { hasPassword: boolean }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await changeMyPassword({ currentPassword, newPassword });
      toast.push(
        hasPassword ? t("profile.passwordUpdatedToast") : t("profile.passwordSetToast"),
        "success",
      );
      setCurrentPassword("");
      setNewPassword("");
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err) {
      setError(apiErrorMessage(err, t("profile.passwordFailedFallback")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <h2 className="text-lg font-bold">{hasPassword ? t("profile.changePassword") : t("profile.setPassword")}</h2>
      {!hasPassword && (
        <p className="text-sm text-on-surface-variant">
          {t("profile.googleOnlyHint")}
        </p>
      )}
      {error && <p className="rounded-control border border-error/30 bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}
      {hasPassword && (
        <div>
          <label className="label" htmlFor="currentPassword">{t("profile.currentPasswordLabel")}</label>
          <input id="currentPassword" type="password" className="input-field" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required />
        </div>
      )}
      <div>
        <label className="label" htmlFor="newPassword">{hasPassword ? t("profile.newPasswordLabel") : t("profile.passwordLabel")}</label>
        <input id="newPassword" type="password" className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required />
        <p className="mt-1 text-xs text-on-surface-variant">{t("profile.passwordHint")}</p>
      </div>
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? t("profile.saving") : hasPassword ? t("profile.updatePassword") : t("profile.setPassword")}
      </button>
    </form>
  );
}

function ApiKeyCard({ profile }: { profile: Profile }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onGenerate() {
    setBusy(true);
    try {
      const { apiKey } = await generateMyApiKey();
      setRevealedKey(apiKey);
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, t("profile.keyGenFailedFallback")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke() {
    setBusy(true);
    try {
      await revokeMyApiKey();
      setRevealedKey(null);
      toast.push(t("profile.keyRevokedToast"), "success");
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, t("profile.keyRevokeFailedFallback")), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-bold">{t("profile.apiKeyHeading")}</h2>
      <p className="text-sm text-on-surface-variant">
        {t("profile.apiKeyIntro")}{" "}
        <a href="/api-docs" className="text-primary hover:underline">{t("profile.apiDocsLink")}</a> {t("profile.apiKeyIntroEnd")}
      </p>

      <BilingualNote tone="warning" en={t("bilingual.apiKeyEn")} bn={t("bilingual.apiKeyBn")} />

      {revealedKey ? (
        <div className="space-y-2 rounded-control border border-warning/40 bg-warning/10 p-3">
          <p className="text-xs font-semibold text-warning">{t("profile.copyNowWarning")}</p>
          <div className="flex items-center gap-2">
            <code className="block min-w-0 flex-1 break-all rounded bg-surface-deep px-2 py-1.5 font-mono text-xs text-on-surface">{revealedKey}</code>
            <CopyButton value={revealedKey} label={t("profile.copyApiKey")} />
          </div>
        </div>
      ) : profile.apiKeyPrefix ? (
        <p className="font-mono text-sm text-on-surface-variant">
          {profile.apiKeyPrefix}••••••••••••••••••••••••
          {profile.apiKeyCreatedAt && <span className="ml-2 text-xs">{t("profile.generatedOn", { date: new Date(profile.apiKeyCreatedAt).toLocaleDateString() })}</span>}
        </p>
      ) : (
        <p className="text-sm text-on-surface-variant">{t("profile.noKeyYet")}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={onGenerate} disabled={busy}>
          {profile.apiKeyPrefix ? t("profile.regenerateKey") : t("profile.generateKey")}
        </button>
        {profile.apiKeyPrefix && (
          <button type="button" className="btn-ghost" onClick={onRevoke} disabled={busy}>
            {t("profile.revoke")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Profile() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: getMyProfile, enabled: !!user });

  if (!user) {
    return <GuestLockedCard title={t("guestGate.pageTitle")} body={t("guestGate.profileBody")} />;
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("profile.title")}</h1>
      <ProfileDetailsCard profile={profile} />
      <ChangePasswordCard hasPassword={profile.hasPassword} />
      <ApiKeyCard profile={profile} />
    </div>
  );
}
