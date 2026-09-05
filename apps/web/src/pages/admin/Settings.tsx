import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DisplayCurrency, LiveChatProvider, ReferrerRewardType } from "@smm/shared";
import { getAdminSettings, sendAdminTestEmail, updateAdminSettings } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { Link } from "react-router-dom";
import { Breadcrumbs, Button } from "../../components/ds/index.js";
import { useToast } from "../../components/ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";

interface AdminSettings {
  siteName: string;
  liveChatProvider: LiveChatProvider;
  liveChatWidgetId: string | null;
  howToOrderVideoUrl: string | null;
  usdToBdtRate: string;
  defaultCurrency: DisplayCurrency;
  smtpEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpFromAddress: string | null;
  smtpConfigured: boolean;
  resendOrderButtonEnabled: boolean;
  firstDepositBonusEnabled: boolean;
  firstDepositBonusPercent: string;
  firstDepositMinAmount: string;
  firstDepositMaxBonus: string;
  referralSystemEnabled: boolean;
  referrerRewardType: ReferrerRewardType;
  referrerRewardValue: string;
  refereeBonusPercent: string;
}

export default function AdminSettingsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: settings } = useQuery({ queryKey: ["admin-settings"], queryFn: getAdminSettings });

  const [form, setForm] = useState({
    siteName: "All In One Service",
    liveChatProvider: "NONE" as LiveChatProvider,
    liveChatWidgetId: "",
    howToOrderVideoUrl: "",
    usdToBdtRate: "110",
    defaultCurrency: "USD" as DisplayCurrency,
    smtpEnabled: false,
    smtpHost: "",
    smtpPort: "",
    smtpUser: "",
    smtpPassword: "",
    smtpFromAddress: "",
    resendOrderButtonEnabled: true,
    firstDepositBonusEnabled: false,
    firstDepositBonusPercent: "0",
    firstDepositMinAmount: "0",
    firstDepositMaxBonus: "0",
    referralSystemEnabled: false,
    referrerRewardType: "PERCENTAGE" as ReferrerRewardType,
    referrerRewardValue: "0",
    refereeBonusPercent: "0",
  });
  const [submitting, setSubmitting] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  useEffect(() => {
    if (user?.email) setTestEmailTo((current) => current || user.email);
  }, [user]);

  useEffect(() => {
    if (!settings) return;
    const s = settings as AdminSettings;
    setForm({
      siteName: s.siteName,
      liveChatProvider: s.liveChatProvider,
      liveChatWidgetId: s.liveChatWidgetId ?? "",
      howToOrderVideoUrl: s.howToOrderVideoUrl ?? "",
      usdToBdtRate: s.usdToBdtRate,
      defaultCurrency: s.defaultCurrency,
      smtpEnabled: s.smtpEnabled,
      smtpHost: s.smtpHost ?? "",
      smtpPort: s.smtpPort ? String(s.smtpPort) : "",
      smtpUser: s.smtpUser ?? "",
      smtpPassword: "",
      smtpFromAddress: s.smtpFromAddress ?? "",
      resendOrderButtonEnabled: s.resendOrderButtonEnabled ?? true,
      firstDepositBonusEnabled: s.firstDepositBonusEnabled ?? false,
      firstDepositBonusPercent: s.firstDepositBonusPercent ?? "0",
      firstDepositMinAmount: s.firstDepositMinAmount ?? "0",
      firstDepositMaxBonus: s.firstDepositMaxBonus ?? "0",
      referralSystemEnabled: s.referralSystemEnabled ?? false,
      referrerRewardType: s.referrerRewardType ?? "PERCENTAGE",
      referrerRewardValue: s.referrerRewardValue ?? "0",
      refereeBonusPercent: s.refereeBonusPercent ?? "0",
    });
  }, [settings]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateAdminSettings({
        siteName: form.siteName,
        liveChatProvider: form.liveChatProvider,
        liveChatWidgetId: form.liveChatWidgetId || null,
        howToOrderVideoUrl: form.howToOrderVideoUrl.trim() || null,
        usdToBdtRate: Number(form.usdToBdtRate),
        defaultCurrency: form.defaultCurrency,
        smtpEnabled: form.smtpEnabled,
        smtpHost: form.smtpHost || null,
        smtpPort: form.smtpPort ? Number(form.smtpPort) : null,
        smtpUser: form.smtpUser || null,
        ...(form.smtpPassword ? { smtpPassword: form.smtpPassword } : {}),
        smtpFromAddress: form.smtpFromAddress || null,
        resendOrderButtonEnabled: form.resendOrderButtonEnabled,
        firstDepositBonusEnabled: form.firstDepositBonusEnabled,
        firstDepositBonusPercent: Number(form.firstDepositBonusPercent) || 0,
        firstDepositMinAmount: Number(form.firstDepositMinAmount) || 0,
        firstDepositMaxBonus: Number(form.firstDepositMaxBonus) || 0,
        referralSystemEnabled: form.referralSystemEnabled,
        referrerRewardType: form.referrerRewardType,
        referrerRewardValue: Number(form.referrerRewardValue) || 0,
        refereeBonusPercent: Number(form.refereeBonusPercent) || 0,
      });
      toast.push("Settings saved.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
      setForm((f) => ({ ...f, smtpPassword: "" }));
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to save settings"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSendTestEmail() {
    if (!testEmailTo.trim()) return;
    setSendingTestEmail(true);
    try {
      await sendAdminTestEmail(testEmailTo.trim());
      toast.push("Test email sent — check the inbox.", "success");
    } catch (err) {
      toast.push(apiErrorMessage(err, "Test email failed"), "error");
    } finally {
      setSendingTestEmail(false);
    }
  }

  return (
    <form onSubmit={onSave} className="mx-auto max-w-2xl space-y-6">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Site Settings" }]} />
      <h1 className="text-xl font-bold">Site Settings</h1>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">Branding &amp; Currency</h2>
        <div>
          <label className="label" htmlFor="siteName">Site name</label>
          <input id="siteName" className="input-field" value={form.siteName} onChange={(e) => setForm((f) => ({ ...f, siteName: e.target.value }))} required />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="usdToBdtRate">USD → BDT rate</label>
            <input id="usdToBdtRate" type="number" step="0.01" className="input-field" value={form.usdToBdtRate} onChange={(e) => setForm((f) => ({ ...f, usdToBdtRate: e.target.value }))} required />
          </div>
          <div>
            <label className="label" htmlFor="defaultCurrency">Default currency</label>
            <select id="defaultCurrency" className="input-field" value={form.defaultCurrency} onChange={(e) => setForm((f) => ({ ...f, defaultCurrency: e.target.value as DisplayCurrency }))}>
              <option value="USD">USD</option>
              <option value="BDT">BDT</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-on-surface-variant">Display-only — every wallet balance and price stays USD-denominated in the database.</p>
      </div>

      <div className="card space-y-2">
        <h2 className="text-sm font-semibold">Floating Help Button</h2>
        <p className="text-sm text-on-surface-variant">
          WhatsApp, Telegram, Messenger and the &ldquo;Open a support ticket&rdquo; option in the floating
          &ldquo;Need help?&rdquo; widget are managed under{" "}
          <Link to="/admin/support-channels" className="text-primary hover:underline">Support Channels</Link>.
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">Live Chat</h2>
        <select className="input-field" value={form.liveChatProvider} onChange={(e) => setForm((f) => ({ ...f, liveChatProvider: e.target.value as LiveChatProvider }))}>
          <option value="NONE">Disabled</option>
          <option value="TAWKTO">Tawk.to</option>
          <option value="CRISP">Crisp</option>
        </select>
        {form.liveChatProvider !== "NONE" && (
          <input
            className="input-field"
            placeholder={form.liveChatProvider === "TAWKTO" ? "Widget ID, e.g. 5f9.../default" : "Website ID"}
            value={form.liveChatWidgetId}
            onChange={(e) => setForm((f) => ({ ...f, liveChatWidgetId: e.target.value }))}
          />
        )}
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">Order Page</h2>
        <div>
          <label className="label" htmlFor="howToOrderVideoUrl">How to Order — Video Link</label>
          <input
            id="howToOrderVideoUrl"
            type="url"
            className="input-field"
            placeholder="https://youtube.com/watch?v=…"
            value={form.howToOrderVideoUrl}
            onChange={(e) => setForm((f) => ({ ...f, howToOrderVideoUrl: e.target.value }))}
          />
          <p className="mt-1 text-xs text-on-surface-variant">Leave empty to hide this link on the order page.</p>
        </div>
      </div>

      <div className="card space-y-2">
        <h2 className="text-sm font-semibold">Admin Orders</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.resendOrderButtonEnabled}
            onChange={(e) => setForm((f) => ({ ...f, resendOrderButtonEnabled: e.target.checked }))}
          />
          Enable the &ldquo;Resend to provider&rdquo; button on the Orders page
        </label>
        <p className="text-xs text-on-surface-variant">
          When off, the button is hidden and the resend endpoint is rejected. Failed orders can still be
          resolved with the status dropdown.
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">First Deposit Bonus</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.firstDepositBonusEnabled}
            onChange={(e) => setForm((f) => ({ ...f, firstDepositBonusEnabled: e.target.checked }))}
          />
          Enable first-deposit bonus
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="fdbPercent">Bonus %</label>
            <input id="fdbPercent" type="number" step="0.01" min="0" max="100" className="input-field" value={form.firstDepositBonusPercent} onChange={(e) => setForm((f) => ({ ...f, firstDepositBonusPercent: e.target.value }))} />
          </div>
          <div>
            <label className="label" htmlFor="fdbMin">Min deposit ($)</label>
            <input id="fdbMin" type="number" step="0.01" min="0" className="input-field" value={form.firstDepositMinAmount} onChange={(e) => setForm((f) => ({ ...f, firstDepositMinAmount: e.target.value }))} />
          </div>
          <div>
            <label className="label" htmlFor="fdbMax">Max bonus cap ($)</label>
            <input id="fdbMax" type="number" step="0.01" min="0" className="input-field" value={form.firstDepositMaxBonus} onChange={(e) => setForm((f) => ({ ...f, firstDepositMaxBonus: e.target.value }))} />
          </div>
        </div>
        <p className="text-xs text-on-surface-variant">
          Credited once, on a user&rsquo;s first-ever deposit that meets the minimum. Max cap of 0 = uncapped. All
          amounts are USD (displayed to users in their chosen currency).
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">Referral Program</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.referralSystemEnabled}
            onChange={(e) => setForm((f) => ({ ...f, referralSystemEnabled: e.target.checked }))}
          />
          Enable the referral program
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="refType">Referrer reward type</label>
            <select id="refType" className="input-field" value={form.referrerRewardType} onChange={(e) => setForm((f) => ({ ...f, referrerRewardType: e.target.value as ReferrerRewardType }))}>
              <option value="PERCENTAGE">Percentage of deposit</option>
              <option value="FIXED">Fixed amount ($)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="refValue">{form.referrerRewardType === "FIXED" ? "Reward ($)" : "Reward %"}</label>
            <input id="refValue" type="number" step="0.01" min="0" className="input-field" value={form.referrerRewardValue} onChange={(e) => setForm((f) => ({ ...f, referrerRewardValue: e.target.value }))} />
          </div>
          <div>
            <label className="label" htmlFor="refereeBonus">Referee bonus %</label>
            <input id="refereeBonus" type="number" step="0.01" min="0" max="100" className="input-field" value={form.refereeBonusPercent} onChange={(e) => setForm((f) => ({ ...f, refereeBonusPercent: e.target.value }))} />
          </div>
        </div>
        <p className="text-xs text-on-surface-variant">
          Both are paid once, on the referred user&rsquo;s first deposit: the referrer gets the reward credited to
          their wallet, the new user gets the referee bonus on top of their deposit. See{" "}
          <Link to="/admin/referrals" className="text-primary hover:underline">Referral Analytics</Link>.
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">SMTP (password reset emails)</h2>
        <p className="text-xs text-on-surface-variant">
          {settings ? ((settings as AdminSettings).smtpConfigured ? "A password is currently saved." : "No password saved yet.") : ""}
          {" "}When left disabled/unconfigured, reset links are logged server-side instead of emailed.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.smtpEnabled} onChange={(e) => setForm((f) => ({ ...f, smtpEnabled: e.target.checked }))} /> Enable SMTP sending
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className="input-field" placeholder="SMTP host" value={form.smtpHost} onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))} />
          <input className="input-field" placeholder="Port" type="number" value={form.smtpPort} onChange={(e) => setForm((f) => ({ ...f, smtpPort: e.target.value }))} />
        </div>
        <input className="input-field" placeholder="SMTP username" value={form.smtpUser} onChange={(e) => setForm((f) => ({ ...f, smtpUser: e.target.value }))} />
        <input className="input-field" type="password" placeholder="SMTP password (leave blank to keep existing)" value={form.smtpPassword} onChange={(e) => setForm((f) => ({ ...f, smtpPassword: e.target.value }))} />
        <input className="input-field" placeholder="From address, e.g. noreply@yourpanel.com" value={form.smtpFromAddress} onChange={(e) => setForm((f) => ({ ...f, smtpFromAddress: e.target.value }))} />

        <div className="flex flex-col gap-2 border-t border-outline-variant pt-3 sm:flex-row sm:items-center">
          <input
            type="email"
            className="input-field sm:flex-1"
            placeholder="Send test email to…"
            value={testEmailTo}
            onChange={(e) => setTestEmailTo(e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            disabled={sendingTestEmail || !testEmailTo.trim()}
            onClick={onSendTestEmail}
          >
            {sendingTestEmail && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {sendingTestEmail ? "Sending…" : "Send test email"}
          </Button>
        </div>
        <p className="text-xs text-on-surface-variant">
          Save your SMTP settings first — the test uses the saved password, not what&apos;s typed above.
        </p>
      </div>

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
