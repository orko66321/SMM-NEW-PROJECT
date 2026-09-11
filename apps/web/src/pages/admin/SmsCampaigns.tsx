import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bdPhoneRegex, computeSmsSegments, type SmsCampaignTargetGroup } from "@smm/shared";
import {
  createAdminSmsCampaign,
  getAdminSmsAudienceCounts,
  getAdminSmsBalance,
  getAdminSmsCampaigns,
} from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { Badge, type BadgeTone, Breadcrumbs, Modal, Pagination, StatCard } from "../../components/ds/index.js";

const TEMPLATES: { label: string; text: string }[] = [
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

const AUDIENCE_OPTIONS: { id: SmsCampaignTargetGroup; label: string }[] = [
  { id: "ALL", label: "All Users" },
  { id: "VIP", label: "VIP Users Only" },
  { id: "RESELLER", label: "Resellers Only" },
  { id: "CUSTOM", label: "Manual Phone Numbers" },
];

/** Splits on commas/newlines/whitespace, dedupes, and separates valid-BD-format from everything else. */
function parseCustomNumbers(raw: string): { valid: string[]; invalidCount: number } {
  const tokens = raw
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const valid = new Set<string>();
  let invalidCount = 0;
  for (const t of tokens) {
    if (bdPhoneRegex.test(t)) valid.add(t);
    else invalidCount += 1;
  }
  return { valid: Array.from(valid), invalidCount };
}

interface CampaignRow {
  id: string;
  title: string;
  targetGroup: SmsCampaignTargetGroup;
  recipientCount: number;
  totalSmsUnits: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  status: "PENDING" | "SENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
  sentBy: { username: string };
}

const CAMPAIGN_STATUS_TONE: Record<CampaignRow["status"], BadgeTone> = {
  PENDING: "warning",
  SENDING: "info",
  COMPLETED: "success",
  FAILED: "error",
};

export default function AdminSmsCampaigns() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: balance } = useQuery({ queryKey: ["admin-sms-balance"], queryFn: getAdminSmsBalance });
  const { data: audience } = useQuery({ queryKey: ["admin-sms-audience-counts"], queryFn: getAdminSmsAudienceCounts });

  const [page, setPage] = useState(1);
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["admin-sms-campaigns", page],
    queryFn: () => getAdminSmsCampaigns({ page, pageSize: 10 }),
  });

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetGroup, setTargetGroup] = useState<SmsCampaignTargetGroup>("ALL");
  const [customNumbersRaw, setCustomNumbersRaw] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const segments = useMemo(() => computeSmsSegments(message), [message]);
  const { valid: customNumbers, invalidCount: customInvalidCount } = useMemo(
    () => parseCustomNumbers(customNumbersRaw),
    [customNumbersRaw],
  );

  const recipientCount =
    targetGroup === "ALL"
      ? (audience?.all ?? 0)
      : targetGroup === "VIP"
        ? (audience?.vip ?? 0)
        : targetGroup === "RESELLER"
          ? (audience?.reseller ?? 0)
          : customNumbers.length;

  const totalSmsUnits = segments.segments * recipientCount;
  const canSubmit =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    recipientCount > 0 &&
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

  const totalPages = history ? Math.ceil(history.total / history.pageSize) : 1;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "SMS Campaigns" }]} />
      <h1 className="text-xl font-bold">SMS Campaigns</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Remaining SMS Balance"
          value={balance?.available ? String(balance.balance) : "—"}
        />
        <StatCard label="Total Targetable Users" value={String(recipientCount)} />
      </div>
      {!balance?.available && (
        <p className="text-xs text-on-surface-variant">
          Balance isn&rsquo;t available from the provider right now — this doesn&rsquo;t block sending.
        </p>
      )}

      <form onSubmit={onSubmit} className="card space-y-4">
        <h2 className="text-sm font-semibold">Compose Campaign</h2>

        <div>
          <label className="label" htmlFor="campaign-title">Campaign title</label>
          <input
            id="campaign-title"
            className="input-field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. September deposit bonus"
            required
          />
        </div>

        <div>
          <label className="label">Target audience</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AUDIENCE_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  targetGroup === opt.id ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant"
                }`}
              >
                <input
                  type="radio"
                  name="targetGroup"
                  className="accent-primary"
                  checked={targetGroup === opt.id}
                  onChange={() => setTargetGroup(opt.id)}
                />
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
            <label className="label" htmlFor="custom-numbers">Phone numbers (one per line, or comma-separated)</label>
            <textarea
              id="custom-numbers"
              className="input-field min-h-[100px] font-mono text-xs"
              placeholder={"01712345678\n01898765432"}
              value={customNumbersRaw}
              onChange={(e) => setCustomNumbersRaw(e.target.value)}
            />
            <p className="mt-1 text-xs text-on-surface-variant">
              {customNumbers.length} valid number{customNumbers.length === 1 ? "" : "s"}
              {customInvalidCount > 0 && ` · ${customInvalidCount} ignored (not a valid BD number)`}
            </p>
          </div>
        )}

        <div>
          <label className="label flex items-center justify-between" htmlFor="campaign-templates">
            <span>Quick templates</span>
          </label>
          <select
            id="campaign-templates"
            className="input-field"
            defaultValue=""
            onChange={(e) => {
              const tpl = TEMPLATES.find((t) => t.label === e.target.value);
              if (tpl) setMessage(tpl.text);
              e.target.value = "";
            }}
          >
            <option value="" disabled>Insert a template…</option>
            {TEMPLATES.map((t) => (
              <option key={t.label} value={t.label}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="campaign-message">Message</label>
          <textarea
            id="campaign-message"
            className="input-field min-h-[120px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <p className="mt-1 font-mono text-xs text-on-surface-variant">
            Characters: {segments.length} · Encoding: {segments.encoding === "GSM7" ? "Standard (GSM-7)" : "Unicode (Bangla)"} ·{" "}
            SMS per user: {segments.segments || 0} · Total estimated SMS: {totalSmsUnits}
          </p>
        </div>

        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          Send Campaign
        </button>
      </form>

      {confirmOpen && (
        <Modal
          title="Confirm campaign"
          onClose={() => setConfirmOpen(false)}
          size="sm"
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setConfirmOpen(false)} disabled={sending}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={onConfirmSend} disabled={sending}>
                {sending ? "Sending…" : "Confirm & Send"}
              </button>
            </div>
          }
        >
          <p className="text-sm text-on-surface">
            Are you sure you want to send this SMS to <strong>{recipientCount}</strong> user{recipientCount === 1 ? "" : "s"}?
            <br />
            Total SMS credits deducted: <strong>{totalSmsUnits}</strong>
          </p>
        </Modal>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold">Campaign history</h2>
        <div className="overflow-x-auto rounded-lg border border-outline-variant">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-container-high text-left text-xs uppercase text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Audience</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {historyLoading && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-on-surface-variant">Loading…</td></tr>
              )}
              {!historyLoading && (history?.items.length ?? 0) === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-on-surface-variant">No campaigns sent yet.</td></tr>
              )}
              {history?.items.map((c: CampaignRow) => (
                <tr key={c.id}>
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
        {history && totalPages > 1 && (
          <div className="mt-3">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
