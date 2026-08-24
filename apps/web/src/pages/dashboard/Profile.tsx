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
      title={copied ? "Copied!" : label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-success">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" />
        </svg>
      )}
    </button>
  );
}

function ProfileDetailsCard({ profile }: { profile: Profile }) {
  const toast = useToast();
  const queryClient = useQueryClient();
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
      toast.push("Profile updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to update profile"), "error");
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
        <h2 className="text-lg font-bold">Account details</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Username</label>
          <input className="input-field" value={profile.username} disabled />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input-field" value={profile.email} disabled />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="phone">Phone (optional)</label>
        <input id="phone" className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801700000000" />
      </div>

      <div className="space-y-2 border-t border-outline-variant pt-4">
        <p className="label">Notification preferences</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} /> Email notifications
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notifyOrderUpdates} onChange={(e) => setNotifyOrderUpdates(e.target.checked)} /> Order status updates
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notifyPromotions} onChange={(e) => setNotifyPromotions(e.target.checked)} /> Promotions &amp; coupon alerts
        </label>
      </div>

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function ChangePasswordCard({ hasPassword }: { hasPassword: boolean }) {
  const toast = useToast();
  const queryClient = useQueryClient();
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
        hasPassword ? "Password updated — other sessions have been signed out." : "Password set — you can now sign in with it too.",
        "success",
      );
      setCurrentPassword("");
      setNewPassword("");
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to change password"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <h2 className="text-lg font-bold">{hasPassword ? "Change password" : "Set a password"}</h2>
      {!hasPassword && (
        <p className="text-sm text-on-surface-variant">
          Your account currently only signs in with Google. Set a password here to also be able to sign in the usual way.
        </p>
      )}
      {error && <p className="rounded-md bg-error/15 px-3 py-2 text-sm text-error">{error}</p>}
      {hasPassword && (
        <div>
          <label className="label" htmlFor="currentPassword">Current password</label>
          <input id="currentPassword" type="password" className="input-field" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required />
        </div>
      )}
      <div>
        <label className="label" htmlFor="newPassword">{hasPassword ? "New password" : "Password"}</label>
        <input id="newPassword" type="password" className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required />
        <p className="mt-1 text-xs text-on-surface-variant">At least 10 characters, with uppercase, lowercase, and a number.</p>
      </div>
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "Saving…" : hasPassword ? "Update password" : "Set password"}
      </button>
    </form>
  );
}

function ApiKeyCard({ profile }: { profile: Profile }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onGenerate() {
    setBusy(true);
    try {
      const { apiKey } = await generateMyApiKey();
      setRevealedKey(apiKey);
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to generate API key"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke() {
    setBusy(true);
    try {
      await revokeMyApiKey();
      setRevealedKey(null);
      toast.push("API key revoked.", "success");
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to revoke API key"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-bold">Reseller API key</h2>
      <p className="text-sm text-on-surface-variant">
        Use this key to place orders and check status programmatically — see the{" "}
        <a href="/api-docs" className="text-primary hover:underline">API documentation</a> for curl/JS/PHP examples.
      </p>

      {revealedKey ? (
        <div className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-3">
          <p className="text-xs font-semibold text-warning">Copy this now — it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="block min-w-0 flex-1 break-all rounded bg-surface-deep px-2 py-1.5 font-mono text-xs text-on-surface">{revealedKey}</code>
            <CopyButton value={revealedKey} label="Copy API key" />
          </div>
        </div>
      ) : profile.apiKeyPrefix ? (
        <p className="font-mono text-sm text-on-surface-variant">
          {profile.apiKeyPrefix}••••••••••••••••••••••••
          {profile.apiKeyCreatedAt && <span className="ml-2 text-xs">generated {new Date(profile.apiKeyCreatedAt).toLocaleDateString()}</span>}
        </p>
      ) : (
        <p className="text-sm text-on-surface-variant">No API key generated yet.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={onGenerate} disabled={busy}>
          {profile.apiKeyPrefix ? "Regenerate key" : "Generate key"}
        </button>
        {profile.apiKeyPrefix && (
          <button type="button" className="btn-ghost" onClick={onRevoke} disabled={busy}>
            Revoke
          </button>
        )}
      </div>
    </div>
  );
}

export default function Profile() {
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: getMyProfile });

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Profile &amp; Settings</h1>
      <ProfileDetailsCard profile={profile} />
      <ChangePasswordCard hasPassword={profile.hasPassword} />
      <ApiKeyCard profile={profile} />
    </div>
  );
}
