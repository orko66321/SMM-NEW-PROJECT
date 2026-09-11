import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DisplayCurrency, LiveChatProvider, ReferrerRewardType } from "@smm/shared";
import { getAdminSettings, sendAdminTestEmail, sendAdminTestSms, updateAdminSettings } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { Link } from "react-router-dom";
import { Breadcrumbs, Button } from "../../components/ds/index.js";
import { useToast } from "../../components/ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";

// Logo & Icon uploads follow the same store-as-base64-data-URI convention as
// Banners / Brand logos (no writable disk on the cPanel host). Accept the
// four web-safe image formats; cap at ~2 MB raw so a huge PNG doesn't bloat
// the settings row / public-settings payload.
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const MAX_IMAGE_DATA_URI = 3_000_000;
const DEFAULT_SITE_COLOR = "#6D28D9";

interface AdminSettings {
  siteName: string;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogImageUrl: string | null;
  mainLogo: string | null;
  walletLogo: string | null;
  autoPayLogo: string | null;
  icon512: string | null;
  icon192: string | null;
  icon512Alt: string | null;
  siteColor: string | null;
  modalEnabled: boolean;
  modalBannerImage: string | null;
  modalText: string | null;
  modalButtonText: string | null;
  modalButtonLink: string | null;
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
  smsEnabled: boolean;
  smsApiKeyConfigured: boolean;
  smsWelcomeEnabled: boolean;
  smsWelcomeTemplate: string | null;
  smsAddFundEnabled: boolean;
  smsAddFundTemplate: string | null;
  smsOrderConfirmationEnabled: boolean;
  smsOrderConfirmationTemplate: string | null;
  resendOrderButtonEnabled: boolean;
  firstDepositBonusEnabled: boolean;
  firstDepositBonusPercent: string;
  firstDepositMinAmount: string;
  firstDepositMaxBonus: string;
  referralSystemEnabled: boolean;
  referrerRewardType: ReferrerRewardType;
  referrerRewardValue: string;
  refereeBonusPercent: string;
  avgCompletionSampleSize: number;
  recentlyCompletedWindowHours: number;
}

/** One image slot in the "Logo & Icon Settings" grid — preview box + Change / Remove. */
function ImageSlot({
  label,
  hint,
  ratio,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  /** Tailwind aspect-ratio class for the preview box, e.g. "aspect-square". */
  ratio: string;
  value: string;
  onChange: (dataUri: string) => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [justUpdated, setJustUpdated] = useState(false);

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked later
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.push("Use a PNG, JPG, SVG or WebP image.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = typeof reader.result === "string" ? reader.result : "";
      if (!dataUri) {
        toast.push("Couldn't read that file.", "error");
        return;
      }
      if (dataUri.length > MAX_IMAGE_DATA_URI) {
        toast.push("That image is too large — keep it under ~2 MB.", "error");
        return;
      }
      onChange(dataUri);
      setJustUpdated(true);
    };
    reader.onerror = () => toast.push("Couldn't read that file.", "error");
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-2 rounded-card border border-outline-variant p-3">
      <p className="text-xs font-semibold text-on-surface">{label}</p>
      <div
        className={`flex items-center justify-center overflow-hidden rounded-control bg-surface-container-highest ${ratio}`}
      >
        {value ? (
          <img src={value} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-on-surface-variant">No image</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
          🔄 Change
        </Button>
        {value && (
          <button
            type="button"
            className="text-xs text-on-surface-variant hover:text-error"
            onClick={() => {
              onChange("");
              setJustUpdated(false);
            }}
          >
            Remove
          </button>
        )}
        {justUpdated && <span className="text-xs font-medium text-success">✓ updated</span>}
      </div>
      {hint && <p className="text-[11px] leading-snug text-on-surface-variant">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}

/** The "Site Color" card — swatch opens a native colour picker. */
function ColorSlot({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const current = value || DEFAULT_SITE_COLOR;
  return (
    <div className="flex flex-col gap-2 rounded-card border border-outline-variant p-3">
      <p className="text-xs font-semibold text-on-surface">Site Color</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="aspect-square w-full rounded-control border border-outline-variant"
        style={{ backgroundColor: current }}
        aria-label="Pick site colour"
      />
      <p className="text-xs text-on-surface-variant">
        Selected:{" "}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="font-mono text-primary hover:underline"
        >
          {current.toUpperCase()}
        </button>
      </p>
      <input
        ref={inputRef}
        type="color"
        value={current}
        className="sr-only"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function AdminSettingsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: settings } = useQuery({ queryKey: ["admin-settings"], queryFn: getAdminSettings });

  const [form, setForm] = useState({
    siteName: "All In One Service",
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    ogImageUrl: "",
    mainLogo: "",
    walletLogo: "",
    autoPayLogo: "",
    icon512: "",
    icon192: "",
    icon512Alt: "",
    siteColor: "",
    modalEnabled: false,
    modalBannerImage: "",
    modalText: "",
    modalButtonText: "",
    modalButtonLink: "",
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
    smsEnabled: false,
    smsApiKey: "",
    smsWelcomeEnabled: false,
    smsWelcomeTemplate: "",
    smsAddFundEnabled: false,
    smsAddFundTemplate: "",
    smsOrderConfirmationEnabled: false,
    smsOrderConfirmationTemplate: "",
    resendOrderButtonEnabled: true,
    firstDepositBonusEnabled: false,
    firstDepositBonusPercent: "0",
    firstDepositMinAmount: "0",
    firstDepositMaxBonus: "0",
    referralSystemEnabled: false,
    referrerRewardType: "PERCENTAGE" as ReferrerRewardType,
    referrerRewardValue: "0",
    refereeBonusPercent: "0",
    avgCompletionSampleSize: "15",
    recentlyCompletedWindowHours: "24",
  });
  const [submitting, setSubmitting] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testSmsTo, setTestSmsTo] = useState("");
  const [sendingTestSms, setSendingTestSms] = useState(false);

  useEffect(() => {
    if (user?.email) setTestEmailTo((current) => current || user.email);
  }, [user]);

  useEffect(() => {
    if (!settings) return;
    const s = settings as AdminSettings;
    setForm({
      siteName: s.siteName,
      metaTitle: s.metaTitle ?? "",
      metaDescription: s.metaDescription ?? "",
      metaKeywords: s.metaKeywords ?? "",
      ogImageUrl: s.ogImageUrl ?? "",
      mainLogo: s.mainLogo ?? "",
      walletLogo: s.walletLogo ?? "",
      autoPayLogo: s.autoPayLogo ?? "",
      icon512: s.icon512 ?? "",
      icon192: s.icon192 ?? "",
      icon512Alt: s.icon512Alt ?? "",
      siteColor: s.siteColor ?? "",
      modalEnabled: s.modalEnabled ?? false,
      modalBannerImage: s.modalBannerImage ?? "",
      modalText: s.modalText ?? "",
      modalButtonText: s.modalButtonText ?? "",
      modalButtonLink: s.modalButtonLink ?? "",
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
      smsEnabled: s.smsEnabled ?? false,
      smsApiKey: "",
      smsWelcomeEnabled: s.smsWelcomeEnabled ?? false,
      smsWelcomeTemplate: s.smsWelcomeTemplate ?? "",
      smsAddFundEnabled: s.smsAddFundEnabled ?? false,
      smsAddFundTemplate: s.smsAddFundTemplate ?? "",
      smsOrderConfirmationEnabled: s.smsOrderConfirmationEnabled ?? false,
      smsOrderConfirmationTemplate: s.smsOrderConfirmationTemplate ?? "",
      resendOrderButtonEnabled: s.resendOrderButtonEnabled ?? true,
      firstDepositBonusEnabled: s.firstDepositBonusEnabled ?? false,
      firstDepositBonusPercent: s.firstDepositBonusPercent ?? "0",
      firstDepositMinAmount: s.firstDepositMinAmount ?? "0",
      firstDepositMaxBonus: s.firstDepositMaxBonus ?? "0",
      referralSystemEnabled: s.referralSystemEnabled ?? false,
      referrerRewardType: s.referrerRewardType ?? "PERCENTAGE",
      referrerRewardValue: s.referrerRewardValue ?? "0",
      refereeBonusPercent: s.refereeBonusPercent ?? "0",
      avgCompletionSampleSize: String(s.avgCompletionSampleSize ?? 15),
      recentlyCompletedWindowHours: String(s.recentlyCompletedWindowHours ?? 24),
    });
  }, [settings]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateAdminSettings({
        siteName: form.siteName,
        metaTitle: form.metaTitle.trim() || null,
        metaDescription: form.metaDescription.trim() || null,
        metaKeywords: form.metaKeywords.trim() || null,
        ogImageUrl: form.ogImageUrl.trim() || null,
        mainLogo: form.mainLogo || null,
        walletLogo: form.walletLogo || null,
        autoPayLogo: form.autoPayLogo || null,
        icon512: form.icon512 || null,
        icon192: form.icon192 || null,
        icon512Alt: form.icon512Alt || null,
        siteColor: form.siteColor || null,
        modalEnabled: form.modalEnabled,
        modalBannerImage: form.modalBannerImage || null,
        modalText: form.modalText.trim() || null,
        modalButtonText: form.modalButtonText.trim() || null,
        modalButtonLink: form.modalButtonLink.trim() || null,
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
        smsEnabled: form.smsEnabled,
        ...(form.smsApiKey ? { smsApiKey: form.smsApiKey } : {}),
        smsWelcomeEnabled: form.smsWelcomeEnabled,
        smsWelcomeTemplate: form.smsWelcomeTemplate.trim() || null,
        smsAddFundEnabled: form.smsAddFundEnabled,
        smsAddFundTemplate: form.smsAddFundTemplate.trim() || null,
        smsOrderConfirmationEnabled: form.smsOrderConfirmationEnabled,
        smsOrderConfirmationTemplate: form.smsOrderConfirmationTemplate.trim() || null,
        resendOrderButtonEnabled: form.resendOrderButtonEnabled,
        firstDepositBonusEnabled: form.firstDepositBonusEnabled,
        firstDepositBonusPercent: Number(form.firstDepositBonusPercent) || 0,
        firstDepositMinAmount: Number(form.firstDepositMinAmount) || 0,
        firstDepositMaxBonus: Number(form.firstDepositMaxBonus) || 0,
        referralSystemEnabled: form.referralSystemEnabled,
        referrerRewardType: form.referrerRewardType,
        referrerRewardValue: Number(form.referrerRewardValue) || 0,
        refereeBonusPercent: Number(form.refereeBonusPercent) || 0,
        avgCompletionSampleSize: Number(form.avgCompletionSampleSize) || 15,
        recentlyCompletedWindowHours: Number(form.recentlyCompletedWindowHours) || 24,
      });
      toast.push("Settings saved.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
      setForm((f) => ({ ...f, smtpPassword: "", smsApiKey: "" }));
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

  async function onSendTestSms() {
    if (!testSmsTo.trim()) return;
    setSendingTestSms(true);
    try {
      await sendAdminTestSms(testSmsTo.trim());
      toast.push("Test SMS sent.", "success");
    } catch (err) {
      toast.push(apiErrorMessage(err, "Test SMS failed"), "error");
    } finally {
      setSendingTestSms(false);
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
        <h2 className="text-sm font-semibold">SEO / Meta Tags</h2>
        <p className="text-xs text-on-surface-variant">
          Used for the browser tab title, Google search snippet and social share previews on every public page.
          Leave a field empty to fall back to the built-in default.
        </p>
        <div>
          <label className="label" htmlFor="metaTitle">Meta Title</label>
          <input
            id="metaTitle"
            className="input-field"
            maxLength={70}
            value={form.metaTitle}
            onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))}
          />
          <p className="mt-1 text-xs text-on-surface-variant">
            Keep it under ~60 characters. <span className="font-mono">{form.metaTitle.length}/70</span>
          </p>
        </div>
        <div>
          <label className="label" htmlFor="metaDescription">Meta Description</label>
          <textarea
            id="metaDescription"
            className="input-field min-h-20"
            maxLength={160}
            value={form.metaDescription}
            onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
          />
          <p className="mt-1 text-xs text-on-surface-variant">
            Keep it under ~160 characters. <span className="font-mono">{form.metaDescription.length}/160</span>
          </p>
        </div>
        <div>
          <label className="label" htmlFor="metaKeywords">Meta Keywords</label>
          <input
            id="metaKeywords"
            className="input-field"
            placeholder="smm panel, buy instagram followers, cheap smm"
            value={form.metaKeywords}
            onChange={(e) => setForm((f) => ({ ...f, metaKeywords: e.target.value }))}
          />
          <p className="mt-1 text-xs text-on-surface-variant">Comma-separated. Optional — most search engines ignore this tag.</p>
        </div>
        <div>
          <label className="label" htmlFor="ogImageUrl">Social Share Image (OG Image) URL</label>
          <input
            id="ogImageUrl"
            type="url"
            className="input-field"
            placeholder="https://…/og-image.png"
            value={form.ogImageUrl}
            onChange={(e) => setForm((f) => ({ ...f, ogImageUrl: e.target.value }))}
          />
          <p className="mt-1 text-xs text-on-surface-variant">
            Absolute URL to a hosted image (recommended 1200×630). Optional.
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-sm font-semibold">🖼️ Logo &amp; Icon Settings</h2>
        <div className="flex items-start gap-2 rounded-control border border-info/30 bg-info/10 p-3 text-xs leading-snug text-on-surface-variant">
          <span aria-hidden>💡</span>
          <span>
            <span className="font-semibold text-on-surface">Note:</span> If you change the logo, an icon or the
            site colour, click <span className="font-semibold text-on-surface">Save settings</span> at the bottom
            of this page — that applies them across the whole site and the installable app.
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ImageSlot
            label="Main Logo (300px × 65px)"
            ratio="aspect-[300/65]"
            hint="Shown in every navbar, footer and sign-in screen. Transparent PNG or SVG recommended."
            value={form.mainLogo}
            onChange={(v) => setForm((f) => ({ ...f, mainLogo: v }))}
          />
          <ImageSlot
            label="Wallet Logo (300px × 105px)"
            ratio="aspect-[300/105]"
            hint="Stored for an upcoming wallet-page mark — not rendered anywhere yet."
            value={form.walletLogo}
            onChange={(v) => setForm((f) => ({ ...f, walletLogo: v }))}
          />
          <ImageSlot
            label="Auto Pay Logo (300px × 105px)"
            ratio="aspect-[300/105]"
            hint="Stored for an upcoming payment-page mark — not rendered anywhere yet."
            value={form.autoPayLogo}
            onChange={(v) => setForm((f) => ({ ...f, autoPayLogo: v }))}
          />
          <ImageSlot
            label="Icon (512px × 512px)"
            ratio="aspect-square"
            hint="Primary app icon / high-res favicon."
            value={form.icon512}
            onChange={(v) => setForm((f) => ({ ...f, icon512: v }))}
          />
          <ImageSlot
            label="Icon 192×192"
            ratio="aspect-square"
            hint="Installable-app (PWA) manifest icon."
            value={form.icon192}
            onChange={(v) => setForm((f) => ({ ...f, icon192: v }))}
          />
          <ImageSlot
            label="Icon 512×512"
            ratio="aspect-square"
            hint="Apple touch icon (iOS home-screen). Separate slot from the primary icon above."
            value={form.icon512Alt}
            onChange={(v) => setForm((f) => ({ ...f, icon512Alt: v }))}
          />
          <ColorSlot value={form.siteColor} onChange={(hex) => setForm((f) => ({ ...f, siteColor: hex }))} />
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">📣 Announcement Modal</h2>
        <p className="text-xs text-on-surface-variant">
          A popup shown once per visitor session when they enter the site. Save this page after editing —
          it takes effect immediately.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.modalEnabled}
            onChange={(e) => setForm((f) => ({ ...f, modalEnabled: e.target.checked }))}
          />
          Enable the announcement popup
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ImageSlot
            label="Banner image"
            ratio="aspect-[16/7]"
            hint="Shown across the top of the modal. PNG/JPG/WebP, kept under ~2 MB. Optional."
            value={form.modalBannerImage}
            onChange={(v) => setForm((f) => ({ ...f, modalBannerImage: v }))}
          />
        </div>

        <div>
          <label className="label" htmlFor="modalText">Notice text</label>
          <textarea
            id="modalText"
            className="input-field min-h-24"
            maxLength={5000}
            placeholder="e.g. 🎉 Eid offer — 10% extra on every deposit until Friday!"
            value={form.modalText}
            onChange={(e) => setForm((f) => ({ ...f, modalText: e.target.value }))}
          />
          <p className="mt-1 text-xs text-on-surface-variant">Plain text. Line breaks are preserved; HTML is not rendered.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="modalButtonText">Action button label</label>
            <input
              id="modalButtonText"
              className="input-field"
              maxLength={60}
              placeholder="Add Funds"
              value={form.modalButtonText}
              onChange={(e) => setForm((f) => ({ ...f, modalButtonText: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="modalButtonLink">Button link</label>
            <input
              id="modalButtonLink"
              className="input-field"
              placeholder="/dashboard/wallet  or  https://…"
              value={form.modalButtonLink}
              onChange={(e) => setForm((f) => ({ ...f, modalButtonLink: e.target.value }))}
            />
          </div>
        </div>
        <p className="text-xs text-on-surface-variant">
          Leave the label &amp; link empty to show the notice with no button. A link starting with{" "}
          <span className="font-mono">/</span> navigates inside the panel; a full URL opens that address.
        </p>
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
        <h2 className="text-sm font-semibold">Service Average Time</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="avgSample">Rolling average sample size</label>
            <input id="avgSample" type="number" step="1" min="1" max="100" className="input-field" value={form.avgCompletionSampleSize} onChange={(e) => setForm((f) => ({ ...f, avgCompletionSampleSize: e.target.value }))} />
          </div>
          <div>
            <label className="label" htmlFor="recentWindow">&ldquo;Recently Completed&rdquo; window (hours)</label>
            <input id="recentWindow" type="number" step="1" min="1" max="720" className="input-field" value={form.recentlyCompletedWindowHours} onChange={(e) => setForm((f) => ({ ...f, recentlyCompletedWindowHours: e.target.value }))} />
          </div>
        </div>
        <p className="text-xs text-on-surface-variant">
          Each service&rsquo;s &ldquo;Average Time&rdquo; is the mean completion time of its last N completed orders,
          recomputed automatically whenever an order for it completes. The &ldquo;Recently Completed&rdquo; badge shows
          only if that service&rsquo;s most recent completion is within the window above.
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

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">SMS Notifications (uronto SMS)</h2>
        <p className="text-xs text-on-surface-variant">
          {settings ? ((settings as AdminSettings).smsApiKeyConfigured ? "An API key is currently saved." : "No API key saved yet.") : ""}
          {" "}Sends a text for welcome / add-fund / order-confirmation events, each toggled independently below.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.smsEnabled} onChange={(e) => setForm((f) => ({ ...f, smsEnabled: e.target.checked }))} /> Enable SMS sending
        </label>
        <input
          className="input-field"
          type="password"
          placeholder="uronto SMS API key (leave blank to keep existing)"
          value={form.smsApiKey}
          onChange={(e) => setForm((f) => ({ ...f, smsApiKey: e.target.value }))}
        />

        <div className="space-y-3 border-t border-outline-variant pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.smsWelcomeEnabled} onChange={(e) => setForm((f) => ({ ...f, smsWelcomeEnabled: e.target.checked }))} /> Welcome SMS (on sign-up, if a phone was given)
          </label>
          <textarea
            className="input-field"
            rows={2}
            placeholder="Welcome to {{siteName}}, {{username}}! Your account is ready — start ordering now."
            value={form.smsWelcomeTemplate}
            onChange={(e) => setForm((f) => ({ ...f, smsWelcomeTemplate: e.target.value }))}
          />
        </div>

        <div className="space-y-3 border-t border-outline-variant pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.smsAddFundEnabled} onChange={(e) => setForm((f) => ({ ...f, smsAddFundEnabled: e.target.checked }))} /> Add Fund SMS (on deposit credit)
          </label>
          <textarea
            className="input-field"
            rows={2}
            placeholder="{{siteName}}: Your deposit of {{amount}} has been credited. New wallet balance: {{balance}}."
            value={form.smsAddFundTemplate}
            onChange={(e) => setForm((f) => ({ ...f, smsAddFundTemplate: e.target.value }))}
          />
        </div>

        <div className="space-y-3 border-t border-outline-variant pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.smsOrderConfirmationEnabled} onChange={(e) => setForm((f) => ({ ...f, smsOrderConfirmationEnabled: e.target.checked }))} /> Order Confirmation SMS (on order placed)
          </label>
          <textarea
            className="input-field"
            rows={2}
            placeholder="{{siteName}}: Order #{{orderId}} for {{service}} (qty {{quantity}}) placed successfully."
            value={form.smsOrderConfirmationTemplate}
            onChange={(e) => setForm((f) => ({ ...f, smsOrderConfirmationTemplate: e.target.value }))}
          />
        </div>
        <p className="text-xs text-on-surface-variant">
          Leave a template blank to use the default wording shown as its placeholder. Available tokens: {"{{siteName}}"}, {"{{username}}"},
          {" "}{"{{amount}}"}, {"{{balance}}"} (Add Fund only), {"{{orderId}}"}, {"{{service}}"}, {"{{quantity}}"} (Order Confirmation only).
        </p>

        <div className="flex flex-col gap-2 border-t border-outline-variant pt-3 sm:flex-row sm:items-center">
          <input
            type="tel"
            className="input-field sm:flex-1"
            placeholder="Send test SMS to… e.g. 01700000000"
            value={testSmsTo}
            onChange={(e) => setTestSmsTo(e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            disabled={sendingTestSms || !testSmsTo.trim()}
            onClick={onSendTestSms}
          >
            {sendingTestSms && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {sendingTestSms ? "Sending…" : "Send test SMS"}
          </Button>
        </div>
        <p className="text-xs text-on-surface-variant">
          Save your SMS settings first — the test uses the saved API key, not what&apos;s typed above.
        </p>
      </div>

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
