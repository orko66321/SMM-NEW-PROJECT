import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DisplayCurrency, LiveChatProvider } from "@smm/shared";
import { getAdminSettings, updateAdminSettings } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { Breadcrumbs } from "../../components/ds/index.js";
import { useToast } from "../../components/ui/Toast.js";

interface AdminSettings {
  siteName: string;
  whatsappEnabled: boolean;
  whatsappNumber: string | null;
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
}

export default function AdminSettingsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["admin-settings"], queryFn: getAdminSettings });

  const [form, setForm] = useState({
    siteName: "All In One Service",
    whatsappEnabled: false,
    whatsappNumber: "",
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
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const s = settings as AdminSettings;
    setForm({
      siteName: s.siteName,
      whatsappEnabled: s.whatsappEnabled,
      whatsappNumber: s.whatsappNumber ?? "",
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
    });
  }, [settings]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateAdminSettings({
        siteName: form.siteName,
        whatsappEnabled: form.whatsappEnabled,
        whatsappNumber: form.whatsappNumber || null,
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

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">WhatsApp Support</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.whatsappEnabled} onChange={(e) => setForm((f) => ({ ...f, whatsappEnabled: e.target.checked }))} /> Show floating WhatsApp button
        </label>
        <input
          className="input-field"
          placeholder="WhatsApp number, e.g. +8801700000000"
          value={form.whatsappNumber}
          onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
        />
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
      </div>

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
