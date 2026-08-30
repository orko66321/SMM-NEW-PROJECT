import { SupportChannelTypeValues } from "@smm/shared";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
// Default display name per type — used when the admin didn't set a `label`.
// CUSTOM has no sensible default, so a label is required there (checked in
// updateSupportChannel).
const DEFAULT_LABELS = {
    WHATSAPP: "WhatsApp",
    TELEGRAM: "Telegram",
    MESSENGER: "Messenger",
    CUSTOM: "Link",
    TICKET: "Open a support ticket",
};
const DEFAULT_SORT = {
    WHATSAPP: 0,
    TELEGRAM: 1,
    MESSENGER: 2,
    CUSTOM: 3,
    TICKET: 4,
};
/**
 * Lazily create one row per known channel type so the admin panel always
 * shows the full list, even before anything's been configured. Same pattern
 * as settings.service.ts's ensureSettings().
 */
async function ensureChannels() {
    await prisma.$transaction(SupportChannelTypeValues.map((type) => prisma.supportChannel.upsert({
        where: { type },
        update: {},
        create: { type, sortOrder: DEFAULT_SORT[type] },
    })));
}
/**
 * Build the outbound href for a channel from its raw stored `value`.
 * Returns null when the value can't produce a usable link — the caller
 * drops that channel, so a misconfigured (or toggled-off) channel is never
 * surfaced. TICKET is special-cased by the caller (in-app modal, no href).
 */
function buildHref(type, value) {
    const v = (value ?? "").trim();
    if (!v)
        return null;
    switch (type) {
        case "WHATSAPP": {
            const digits = v.replace(/[^0-9]/g, "");
            return digits.length >= 6 ? `https://wa.me/${digits}` : null;
        }
        case "TELEGRAM": {
            // Accept "@handle", "handle", or a full t.me URL.
            if (/^https?:\/\//i.test(v))
                return /^https:\/\/t\.me\//i.test(v) ? v : null;
            const handle = v.replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "");
            return handle ? `https://t.me/${handle}` : null;
        }
        case "MESSENGER": {
            // Accept a full m.me / facebook.com URL, or a bare page username.
            if (/^https?:\/\//i.test(v)) {
                return /^https:\/\/(m\.me|(www\.)?facebook\.com|(www\.)?messenger\.com)\//i.test(v) ? v : null;
            }
            const handle = v.replace(/^@/, "").replace(/[^A-Za-z0-9.]/g, "");
            return handle ? `https://m.me/${handle}` : null;
        }
        case "CUSTOM":
            return /^https?:\/\/\S+$/i.test(v) ? v : null;
        case "TICKET":
            return null;
    }
}
/** Admin-facing list — every row, raw stored fields, ordered for display. */
export async function listSupportChannelsForAdmin() {
    await ensureChannels();
    const rows = await prisma.supportChannel.findMany({ orderBy: [{ sortOrder: "asc" }, { type: "asc" }] });
    return rows.map((r) => ({
        type: r.type,
        enabled: r.enabled,
        value: r.value,
        label: r.label,
        sortOrder: r.sortOrder,
    }));
}
export async function updateSupportChannel(type, input) {
    await ensureChannels();
    const value = input.value?.trim() || null;
    const label = input.label?.trim() || null;
    if (input.enabled && type !== "TICKET") {
        if (!value) {
            throw AppError.badRequest(`Enter a ${DEFAULT_LABELS[type]} contact before enabling this channel`);
        }
        if (!buildHref(type, value)) {
            throw AppError.badRequest(`That ${DEFAULT_LABELS[type]} value doesn't look valid — check the format`);
        }
        if (type === "CUSTOM" && !label) {
            throw AppError.badRequest("A custom link needs a label (the text shown in the widget)");
        }
    }
    const row = await prisma.supportChannel.update({
        where: { type },
        data: { enabled: input.enabled, value, label, sortOrder: input.sortOrder },
    });
    return { type: row.type, enabled: row.enabled, value: row.value, label: row.label, sortOrder: row.sortOrder };
}
/**
 * Public — only enabled channels, href already resolved server-side. A
 * toggled-off or misconfigured channel is filtered out here, so nothing
 * about it ever reaches an unauthenticated client.
 */
export async function listPublicSupportChannels() {
    await ensureChannels();
    const rows = await prisma.supportChannel.findMany({
        where: { enabled: true },
        orderBy: [{ sortOrder: "asc" }, { type: "asc" }],
    });
    const out = [];
    for (const r of rows) {
        const label = r.label?.trim() || DEFAULT_LABELS[r.type];
        if (r.type === "TICKET") {
            out.push({ type: "TICKET", label, href: null, external: false });
            continue;
        }
        const href = buildHref(r.type, r.value);
        if (!href)
            continue;
        out.push({ type: r.type, label, href, external: true });
    }
    return out;
}
