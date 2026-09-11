import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bdPhoneRegex, computeSmsSegments, type CampaignTargetGroup } from "@smm/shared";
import {
  createAdminSmsCampaign,
  getAdminSmsAudienceCounts,
  getAdminSmsBalance,
  getAdminSmsCampaigns,
  createAdminEmailCampaign,
  getAdminEmailAudienceCounts,
  getAdminEmailCampaigns,
  getAdminSettings,
} from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { Link } from "react-router-dom";
import { Badge, type BadgeTone, Breadcrumbs, Modal, Pagination, StatCard, Tabs } from "../../components/ds/index.js";

// ── Shared across both channels ────────────────────────────────────────

const AUDIENCE_OPTIONS: { id: CampaignTargetGroup; label: string }[] = [
  { id: "ALL", label: "All Users" },
  { id: "VIP", label: "VIP Users Only" },
  { id: "RESELLER", label: "Resellers Only" },
  { id: "CUSTOM", label: "Manual List" },
];

type CampaignStatusStr = "PENDING" | "SENDING" | "COMPLETED" | "FAILED";
const CAMPAIGN_STATUS_TONE: Record<CampaignStatusStr, BadgeTone> = {
  PENDING: "warning",
  SENDING: "info",
  COMPLETED: "success",
  FAILED: "error",
};

/**
 * Read-only view of the channel's master switch (SiteSettings.smsEnabled /
 * emailBroadcastEnabled) with a link to the card that actually edits it.
 * Deliberately not an inline toggle here — Settings' PUT accepts a full
 * settings payload (several other fields on that form are required, not
 * optional), and re-deriving that whole payload just to flip one boolean
 * risks silently reverting something else the admin has open elsewhere;
 * one canonical place to write it is safer than two.
 */
function MasterSwitchStatus({ label, enabled }: { label: string; enabled: boolean | undefined }) {
  return (
    <div className="flex items-center justify-between rounded-control border border-outline-variant bg-surface-container-high px-3 py-2.5 text-sm">
      <span>
        {label}: <span className={enabled ? "font-semibold text-success" : "font-semibold text-on-surface-variant"}>{enabled ? "ON" : "OFF"}</span>
      </span>
      <Link to="/admin/settings" className="text-xs text-primary hover:underline">
        Manage in Settings →
      </Link>
    </div>
  );
}

function ConfirmSendModal({
  channel,
  recipientCount,
  extraLine,
  sending,
  onCancel,
  onConfirm,
}: {
  channel: "SMS" | "Email";
  recipientCount: number;
  extraLine?: string;
  sending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      title={`Confirm ${channel} campaign`}
      onClose={onCancel}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={sending}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm} disabled={sending}>
            {sending ? "Sending…" : "Confirm & Send"}
          </button>
        </div>
      }
    >
      <p className="text-sm text-on-surface">
        Are you sure you want to send this {channel} to <strong>{recipientCount}</strong> user{recipientCount === 1 ? "" : "s"}?
        {extraLine && (
          <>
            <br />
            {extraLine}
          </>
        )}
      </p>
    </Modal>
  );
}

// ── Tab 1: Bulk SMS ───────────────────────────────────────────────────

const SMS_TEMPLATES: { label: string; text: string }[] = [
  {
    label: "Exclusive Offer",
    text: "AIO: Enjoy an exclusive bonus on your next deposit today! Top up now and grab the offer before it ends.",
  },
  {
    label: "System Maintenance",
    text: "AIO: Scheduled maintenance tonight — orders may be delayed briefly. Thanks for your patience.",
  },
  {
    label: "Deposit Bonus",
    text: "AIO: Get an extra bonus on every deposit this week. Add funds now and order more for less!",
  },
];

/** Splits on commas/newlines/whitespace, dedupes, and separates valid-BD-format from everything else. */
function parseCustomNumbers(raw: string): { valid: string[]; invalidCount: number } {
  const tokens = raw.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
  const valid = new Set<string>();
  let invalidCount = 0;
  for (const t of tokens) {
    if (bdPhoneRegex.test(t)) valid.add(t);
    else invalidCount += 1;
  }
  return { valid: Array.from(valid), invalidCount };
}

interface SmsCampaignRow {
  id: string;
  title: string;
  targetGroup: CampaignTargetGroup;
  recipientCount: number;
  totalSmsUnits: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  status: CampaignStatusStr;
  createdAt: string;
  sentBy: { username: string };
}

function SmsTab({ smsEnabled }: { smsEnabled: boolean | undefined }) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: balance } = useQuery({ queryKey: ["admin-sms-balance"], queryFn: getAdminSmsBalance });
  const { data: audience } = useQuery({ queryKey: ["admin-sms-audience-counts"], queryFn: getAdminSmsAudienceCounts });

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetGroup, setTargetGroup] = useState<CampaignTargetGroup>("ALL");
  const [customNumbersRaw, setCustomNumbersRaw] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const segments = useMemo(() => computeSmsSegments(message), [message]);
  const { valid: customNumbers, invalidCount: customInvalidCount } = useMemo(
    () => parseCustomNumbers(customNumbersRaw),
    [customNumbersRaw],
  );

  const recipientCount =
    targetGroup === "ALL" ? (audience?.all ?? 0)
    : targetGroup === "VIP" ? (audience?.vip ?? 0)
    : targetGroup === "RESELLER" ? (audience?.reseller ?? 0)
    : customNumbers.length;

  const totalSmsUnits = segments.segments * recipientCount;
  const canSubmit =
    title.trim().length > 0 && message.trim().length > 0 && recipientCount > 0 &&
    (targetGroup !== "CUSTOM" || customNumbers.length > 0);

  async function onConfirmSend() {
    setSending(true);
    try {
      await createAdminSmsCampaign({
        title: title.trim(),
        message: message.trim(),
        targetGroup,
        ...(targetGroup === "CUSTOM" ? { customNumbers } : {}),
      });
      toast.push("Campaign queued — sending in batches now.", "success");
      setConfirmOpen(false);
      setTitle("");
      setMessage("");
      setCustomNumbersRaw("");
      queryClient.invalidateQueries({ queryKey: ["admin-sms-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["admin-campaign-history"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to queue campaign"), "error");
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setConfirmOpen(true);
  }

  return (
    <div className="space-y-6">
      <MasterSwitchStatus label="Bulk SMS sending" enabled={smsEnabled} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Remaining SMS Balance" value={balance?.available ? String(balance.balance) : "—"} />
        <StatCard label="Total Targetable Users" value={String(recipientCount)} />
      </div>
      {!balance?.available && (
        <p className="text-xs text-on-surface-variant">Balance isn&rsquo;t available from the provider right now — this doesn&rsquo;t block sending.</p>
      )}

      <form onSubmit={onSubmit} className="card space-y-4">
        <h2 className="text-sm font-semibold">Compose SMS Campaign</h2>

        <div>
          <label className="label" htmlFor="sms-campaign-title">Campaign title</label>
          <input id="sms-campaign-title" className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. September deposit bonus" required />
        </div>

        <div>
          <label className="label">Target audience</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AUDIENCE_OPTIONS.map((opt) => (
              <label key={opt.id} className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${targetGroup === opt.id ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant"}`}>
                <input type="radio" name="smsTargetGroup" className="accent-primary" checked={targetGroup === opt.id} onChange={() => setTargetGroup(opt.id)} />
                {opt.label}
                {opt.id !== "CUSTOM" && (
                  <span className="ml-auto font-mono text-xs text-on-surface-variant">
                    {opt.id === "ALL" ? (audience?.all ?? "…") : opt.id === "VIP" ? (audience?.vip ?? "…") : (audience?.reseller ?? "…")}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {targetGroup === "CUSTOM" && (
          <div>
            <label className="label" htmlFor="sms-custom-numbers">Phone numbers (one per line, or comma-separated)</label>
            <textarea id="sms-custom-numbers" className="input-field min-h-[100px] font-mono text-xs" placeholder={"01712345678\n01898765432"} value={customNumbersRaw} onChange={(e) => setCustomNumbersRaw(e.target.value)} />
            <p className="mt-1 text-xs text-on-surface-variant">
              {customNumbers.length} valid number{customNumbers.length === 1 ? "" : "s"}
              {customInvalidCount > 0 && ` · ${customInvalidCount} ignored (not a valid BD number)`}
            </p>
          </div>
        )}

        <div>
          <label className="label" htmlFor="sms-campaign-templates">Quick templates</label>
          <select id="sms-campaign-templates" className="input-field" defaultValue="" onChange={(e) => {
            const tpl = SMS_TEMPLATES.find((t) => t.label === e.target.value);
            if (tpl) setMessage(tpl.text);
            e.target.value = "";
          }}>
            <option value="" disabled>Insert a template…</option>
            {SMS_TEMPLATES.map((t) => <option key={t.label} value={t.label}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="sms-campaign-message">Message</label>
          <textarea id="sms-campaign-message" className="input-field min-h-[120px]" value={message} onChange={(e) => setMessage(e.target.value)} required />
          <p className="mt-1 font-mono text-xs text-on-surface-variant">
            Characters: {segments.length} · Encoding: {segments.encoding === "GSM7" ? "Standard (GSM-7)" : "Unicode (Bangla)"} · SMS per user: {segments.segments || 0} · Total estimated SMS: {totalSmsUnits}
          </p>
        </div>

        <button type="submit" className="btn-primary" disabled={!canSubmit}>Send SMS Campaign</button>
      </form>

      {confirmOpen && (
        <ConfirmSendModal
          channel="SMS"
          recipientCount={recipientCount}
          extraLine={`Total SMS credits deducted: ${totalSmsUnits}`}
          sending={sending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={onConfirmSend}
        />
      )}
    </div>
  );
}

// ── Tab 2: Bulk Email ─────────────────────────────────────────────────

const EMAIL_TEMPLATES: { label: string; subject: string; html: string }[] = [
  {
    label: "New Game Top-Up Offer",
    subject: "🎮 New Top-Up Offer Just for You, {{username}}!",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
  <h2 style="color:#6D28D9;">Hey {{username}}, a fresh offer just dropped!</h2>
  <p>Top up your favorite game now and get more value on every order.</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="https://allinonsr.com/dashboard/store" style="background:#6D28D9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Shop the Offer</a>
  </p>
  <p style="color:#888;font-size:12px;">You're receiving this because you have an account on All In One Service.</p>
</div>`,
  },
  {
    label: "Discount Campaign",
    subject: "💸 Limited-Time Discount — Don't Miss Out, {{username}}",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
  <h2 style="color:#6D28D9;">A special discount for you, {{username}}</h2>
  <p>For a limited time, enjoy extra value on your next deposit or order.</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="https://allinonsr.com/dashboard/wallet" style="background:#6D28D9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Claim the Discount</a>
  </p>
  <p style="color:#888;font-size:12px;">Offer valid for a limited time only.</p>
</div>`,
  },
  {
    label: "Maintenance Alert",
    subject: "⚠️ Scheduled Maintenance Notice",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
  <h2 style="color:#6D28D9;">Scheduled maintenance</h2>
  <p>Hi {{username}}, we'll be performing scheduled maintenance shortly. Some orders may be delayed during this window.</p>
  <p>Thanks for your patience — everything will be back to normal shortly.</p>
</div>`,
  },
];

/** Splits on commas/newlines/whitespace, dedupes, and separates syntactically-valid emails from everything else. */
function parseCustomEmails(raw: string): { valid: string[]; invalidCount: number } {
  const tokens = raw.split(/[\s,]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid = new Set<string>();
  let invalidCount = 0;
  for (const t of tokens) {
    if (emailRe.test(t)) valid.add(t);
    else invalidCount += 1;
  }
  return { valid: Array.from(valid), invalidCount };
}

interface EmailCampaignRow {
  id: string;
  title: string;
  subject: string;
  targetGroup: CampaignTargetGroup;
  recipientCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  status: CampaignStatusStr;
  createdAt: string;
  sentBy: { username: string };
}

function EmailTab({ emailBroadcastEnabled }: { emailBroadcastEnabled: boolean | undefined }) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: audience } = useQuery({ queryKey: ["admin-email-audience-counts"], queryFn: getAdminEmailAudienceCounts });

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [targetGroup, setTargetGroup] = useState<CampaignTargetGroup>("ALL");
  const [customEmailsRaw, setCustomEmailsRaw] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { valid: customEmails, invalidCount: customInvalidCount } = useMemo(
    () => parseCustomEmails(customEmailsRaw),
    [customEmailsRaw],
  );

  const recipientCount =
    targetGroup === "ALL" ? (audience?.all ?? 0)
    : targetGroup === "VIP" ? (audience?.vip ?? 0)
    : targetGroup === "RESELLER" ? (audience?.reseller ?? 0)
    : customEmails.length;

  const canSubmit =
    title.trim().length > 0 && subject.trim().length > 0 && bodyHtml.trim().length > 0 && recipientCount > 0 &&
    (targetGroup !== "CUSTOM" || customEmails.length > 0);

  // {{username}} preview with a sample name — recipients get their real one.
  const previewSubject = subject.replace(/\{\{username\}\}/g, "Alex");
  const previewHtml = bodyHtml.replace(/\{\{username\}\}/g, "Alex");

  async function onConfirmSend() {
    setSending(true);
    try {
      await createAdminEmailCampaign({
        title: title.trim(),
        subject: subject.trim(),
        bodyHtml: bodyHtml.trim(),
        targetGroup,
        ...(targetGroup === "CUSTOM" ? { customEmails } : {}),
      });
      toast.push("Campaign queued — sending in batches now.", "success");
      setConfirmOpen(false);
      setTitle("");
      setSubject("");
      setBodyHtml("");
      setCustomEmailsRaw("");
      queryClient.invalidateQueries({ queryKey: ["admin-email-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["admin-campaign-history"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to queue campaign"), "error");
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setConfirmOpen(true);
  }

  return (
    <div className="space-y-6">
      <MasterSwitchStatus label="Bulk email sending" enabled={emailBroadcastEnabled} />

      <StatCard label="Total Targetable Users" value={String(recipientCount)} />

      <form onSubmit={onSubmit} className="card space-y-4">
        <h2 className="text-sm font-semibold">Compose Email Campaign</h2>

        <div>
          <label className="label" htmlFor="email-campaign-title">Campaign title</label>
          <input id="email-campaign-title" className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. September top-up promo" required />
        </div>

        <div>
          <label className="label">Target audience</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AUDIENCE_OPTIONS.map((opt) => (
              <label key={opt.id} className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${targetGroup === opt.id ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant"}`}>
                <input type="radio" name="emailTargetGroup" className="accent-primary" checked={targetGroup === opt.id} onChange={() => setTargetGroup(opt.id)} />
                {opt.label}
                {opt.id !== "CUSTOM" && (
                  <span className="ml-auto font-mono text-xs text-on-surface-variant">
                    {opt.id === "ALL" ? (audience?.all ?? "…") : opt.id === "VIP" ? (audience?.vip ?? "…") : (audience?.reseller ?? "…")}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {targetGroup === "CUSTOM" && (
          <div>
            <label className="label" htmlFor="email-custom-emails">Email addresses (one per line, or comma-separated)</label>
            <textarea id="email-custom-emails" className="input-field min-h-[100px] font-mono text-xs" placeholder={"user1@example.com\nuser2@example.com"} value={customEmailsRaw} onChange={(e) => setCustomEmailsRaw(e.target.value)} />
            <p className="mt-1 text-xs text-on-surface-variant">
              {customEmails.length} valid address{customEmails.length === 1 ? "" : "es"}
              {customInvalidCount > 0 && ` · ${customInvalidCount} ignored (not a valid email)`}
            </p>
          </div>
        )}

        <div>
          <label className="label" htmlFor="email-campaign-templates">Quick templates</label>
          <select id="email-campaign-templates" className="input-field" defaultValue="" onChange={(e) => {
            const tpl = EMAIL_TEMPLATES.find((t) => t.label === e.target.value);
            if (tpl) {
              setSubject(tpl.subject);
              setBodyHtml(tpl.html);
            }
            e.target.value = "";
          }}>
            <option value="" disabled>Insert a template…</option>
            {EMAIL_TEMPLATES.map((t) => <option key={t.label} value={t.label}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="email-campaign-subject">Subject line</label>
          <input id="email-campaign-subject" className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="🎁 A special offer for you, {{username}}!" required />
        </div>

        <div>
          <label className="label flex items-center justify-between" htmlFor="email-campaign-body">
            <span>Email body (HTML)</span>
            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? "Hide preview" : "Show live preview"}
            </button>
          </label>
          <textarea id="email-campaign-body" className="input-field min-h-[220px] font-mono text-xs" value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} placeholder="Write or paste HTML. Use {{username}} to personalize per recipient." required />
          <p className="mt-1 text-xs text-on-surface-variant">
            Supports raw HTML — links, images, inline-styled buttons. {"{{username}}"} is replaced per recipient (falls back to &ldquo;there&rdquo; if unknown).
          </p>
        </div>

        {showPreview && (
          <div className="overflow-hidden rounded-control border border-outline-variant">
            <p className="border-b border-outline-variant bg-surface-container-high px-3 py-2 text-xs font-semibold text-on-surface-variant">
              Live Preview — Subject: {previewSubject || "(empty)"}
            </p>
            <div className="max-h-96 overflow-auto bg-white p-4 text-black">
              {bodyHtml.trim() ? (
                // Admin-only page, previewing HTML the same admin just typed
                // in the textarea above — never another user's content.
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <p className="text-sm text-gray-400">Nothing to preview yet.</p>
              )}
            </div>
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={!canSubmit}>Send Email Campaign</button>
      </form>

      {confirmOpen && (
        <ConfirmSendModal
          channel="Email"
          recipientCount={recipientCount}
          sending={sending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={onConfirmSend}
        />
      )}
    </div>
  );
}

// ── Tab 3: History (merged SMS + Email) ──────────────────────────────

const HISTORY_PAGE_SIZE = 15;
const HISTORY_FETCH_SIZE = 50; // pulled from each channel, merged, then paginated client-side

function HistoryTab() {
  const [page, setPage] = useState(1);
  const { data: smsHistory, isLoading: smsLoading } = useQuery({
    queryKey: ["admin-campaign-history", "sms"],
    queryFn: () => getAdminSmsCampaigns({ page: 1, pageSize: HISTORY_FETCH_SIZE }),
  });
  const { data: emailHistory, isLoading: emailLoading } = useQuery({
    queryKey: ["admin-campaign-history", "email"],
    queryFn: () => getAdminEmailCampaigns({ page: 1, pageSize: HISTORY_FETCH_SIZE }),
  });

  const merged = useMemo(() => {
    const smsItems = (smsHistory?.items ?? []) as SmsCampaignRow[];
    const emailItems = (emailHistory?.items ?? []) as EmailCampaignRow[];
    const sms = smsItems.map((c) => ({ ...c, channel: "SMS" as const }));
    const email = emailItems.map((c) => ({ ...c, channel: "Email" as const }));
    return [...sms, ...email].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [smsHistory, emailHistory]);

  const totalPages = Math.max(1, Math.ceil(merged.length / HISTORY_PAGE_SIZE));
  const pageItems = merged.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE);
  const loading = smsLoading || emailLoading;

  return (
    <div>
      <p className="mb-3 text-xs text-on-surface-variant">
        Most recent {HISTORY_FETCH_SIZE} campaigns per channel, merged by date.
      </p>
      <div className="overflow-x-auto rounded-lg border border-outline-variant">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-surface-container-high text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Audience</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-on-surface-variant">Loading…</td></tr>}
            {!loading && pageItems.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-on-surface-variant">No campaigns sent yet.</td></tr>
            )}
            {pageItems.map((c) => (
              <tr key={`${c.channel}-${c.id}`}>
                <td className="px-4 py-3">
                  <Badge tone={c.channel === "SMS" ? "primary" : "info"}>{c.channel}</Badge>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-on-surface">{c.title}</p>
                  <p className="text-xs text-on-surface-variant">by @{c.sentBy.username}</p>
                </td>
                <td className="px-4 py-3">{c.targetGroup}</td>
                <td className="px-4 py-3 text-xs">{new Date(c.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {c.processedCount}/{c.recipientCount}
                  <span className="ml-1.5 text-success">✓{c.successCount}</span>
                  {c.failedCount > 0 && <span className="ml-1.5 text-error">✗{c.failedCount}</span>}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={CAMPAIGN_STATUS_TONE[c.status]}>{c.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-3">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function AdminCampaignManager() {
  const [tab, setTab] = useState<"sms" | "email" | "history">("sms");
  const { data: settings } = useQuery({ queryKey: ["admin-settings"], queryFn: getAdminSettings });
  const s = settings as { smsEnabled?: boolean; emailBroadcastEnabled?: boolean } | undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Broadcast & Campaign Center" }]} />
      <h1 className="text-xl font-bold">Broadcast &amp; Campaign Center</h1>

      <Tabs
        items={[
          { id: "sms", label: "Bulk SMS Manager" },
          { id: "email", label: "Bulk Email Manager" },
          { id: "history", label: "Campaign History & Logs" },
        ]}
        activeId={tab}
        onChange={(id) => setTab(id as "sms" | "email" | "history")}
      />

      {tab === "sms" && <SmsTab smsEnabled={s?.smsEnabled} />}
      {tab === "email" && <EmailTab emailBroadcastEnabled={s?.emailBroadcastEnabled} />}
      {tab === "history" && <HistoryTab />}
    </div>
  );
}
