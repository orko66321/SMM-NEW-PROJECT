import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminSupportChannel, SupportChannelType } from "@smm/shared";
import { getAdminSupportChannels, updateAdminSupportChannel } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { Breadcrumbs } from "../../components/ds/index.js";
import { useToast } from "../../components/ui/Toast.js";

type RowMeta = {
  name: string;
  blurb: string;
  hasValue: boolean;
  valueLabel?: string;
  valuePlaceholder?: string;
  labelPlaceholder: string;
};

const META: Record<SupportChannelType, RowMeta> = {
  WHATSAPP: {
    name: "WhatsApp",
    blurb: "Opens wa.me with this number.",
    hasValue: true,
    valueLabel: "WhatsApp number",
    valuePlaceholder: "+8801700000000",
    labelPlaceholder: "WhatsApp",
  },
  TELEGRAM: {
    name: "Telegram",
    blurb: "Opens t.me with this username.",
    hasValue: true,
    valueLabel: "Telegram username or t.me link",
    valuePlaceholder: "@yourpanel",
    labelPlaceholder: "Telegram",
  },
  MESSENGER: {
    name: "Messenger",
    blurb: "Opens m.me with this page username, or a full m.me / facebook.com link.",
    hasValue: true,
    valueLabel: "Messenger username or link",
    valuePlaceholder: "yourpage",
    labelPlaceholder: "Messenger",
  },
  CUSTOM: {
    name: "Custom link",
    blurb: "Any other channel — opens this URL in a new tab. A label is required.",
    hasValue: true,
    valueLabel: "Full URL (https://…)",
    valuePlaceholder: "https://discord.gg/…",
    labelPlaceholder: "Live chat",
  },
  TICKET: {
    name: "Support ticket",
    blurb: "Adds an “Open a support ticket” option that opens the ticket form in a modal.",
    hasValue: false,
    labelPlaceholder: "Open a support ticket",
  },
};

const ORDER: SupportChannelType[] = ["WHATSAPP", "TELEGRAM", "MESSENGER", "CUSTOM", "TICKET"];

interface DraftRow {
  enabled: boolean;
  value: string;
  label: string;
  sortOrder: string;
}

function toDraft(c: AdminSupportChannel): DraftRow {
  return {
    enabled: c.enabled,
    value: c.value ?? "",
    label: c.label ?? "",
    sortOrder: String(c.sortOrder),
  };
}

export default function AdminSupportChannels() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data } = useQuery<AdminSupportChannel[]>({
    queryKey: ["admin-support-channels"],
    queryFn: getAdminSupportChannels,
  });

  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [savingType, setSavingType] = useState<SupportChannelType | null>(null);

  useEffect(() => {
    if (!data) return;
    setDrafts(Object.fromEntries(data.map((c) => [c.type, toDraft(c)])));
  }, [data]);

  const byType = new Map((data ?? []).map((c) => [c.type, c]));
  const rows = ORDER.filter((t) => byType.has(t));

  function patch(type: SupportChannelType, next: Partial<DraftRow>) {
    setDrafts((d) => {
      const current = d[type];
      if (!current) return d;
      return { ...d, [type]: { ...current, ...next } };
    });
  }

  async function save(type: SupportChannelType) {
    const draft = drafts[type];
    if (!draft) return;
    setSavingType(type);
    try {
      await updateAdminSupportChannel(type, {
        enabled: draft.enabled,
        value: draft.value.trim() || null,
        label: draft.label.trim() || null,
        sortOrder: Number(draft.sortOrder) || 0,
      });
      toast.push(`${META[type].name} saved.`, "success");
      queryClient.invalidateQueries({ queryKey: ["admin-support-channels"] });
      queryClient.invalidateQueries({ queryKey: ["public-support-channels"] });
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to save channel"), "error");
    } finally {
      setSavingType(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Support Channels" }]} />
      <div>
        <h1 className="text-xl font-bold">Support Channels</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Controls the floating &ldquo;Need help?&rdquo; button. Only channels toggled on appear on the site —
          changes go live immediately, no deploy needed.
        </p>
      </div>

      {rows.map((type) => {
        const meta = META[type];
        const draft = drafts[type];
        if (!draft) return null;
        return (
          <div key={type} className="card space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">{meta.name}</h2>
                <p className="mt-0.5 text-xs text-on-surface-variant">{meta.blurb}</p>
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) => patch(type, { enabled: e.target.checked })}
                />
                {draft.enabled ? "On" : "Off"}
              </label>
            </div>

            {meta.hasValue && (
              <div>
                <label className="label" htmlFor={`${type}-value`}>{meta.valueLabel}</label>
                <input
                  id={`${type}-value`}
                  className="input-field"
                  placeholder={meta.valuePlaceholder}
                  value={draft.value}
                  onChange={(e) => patch(type, { value: e.target.value })}
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="label" htmlFor={`${type}-label`}>
                  Button label {type === "CUSTOM" ? "(required)" : "(optional)"}
                </label>
                <input
                  id={`${type}-label`}
                  className="input-field"
                  placeholder={meta.labelPlaceholder}
                  value={draft.label}
                  onChange={(e) => patch(type, { label: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor={`${type}-order`}>Order</label>
                <input
                  id={`${type}-order`}
                  type="number"
                  className="input-field"
                  value={draft.sortOrder}
                  onChange={(e) => patch(type, { sortOrder: e.target.value })}
                />
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              disabled={savingType === type}
              onClick={() => save(type)}
            >
              {savingType === type ? "Saving…" : "Save"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
