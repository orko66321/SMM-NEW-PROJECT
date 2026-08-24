import axios from "axios";
import { prisma } from "../lib/prisma.js";
import { decrypt } from "../lib/crypto.js";
import { AppError } from "../utils/AppError.js";
async function postAction(provider, action, params, timeoutMs = 15_000) {
    const apiKey = decrypt(provider.apiKeyCiphertext);
    const body = new URLSearchParams({ key: apiKey, action, ...stringifyParams(params) });
    try {
        const res = await axios.post(provider.apiUrl, body, {
            timeout: timeoutMs,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        if (res.data && typeof res.data === "object" && "error" in res.data) {
            throw new Error(String(res.data.error));
        }
        await logSync(provider.id, action, "SUCCESS", null);
        return res.data;
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown provider error";
        await logSync(provider.id, action, "FAILURE", message);
        throw AppError.badRequest(`Provider request failed (${action}): ${message}`);
    }
}
function stringifyParams(params) {
    return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]));
}
async function logSync(providerId, action, status, message) {
    await prisma.providerSyncLog.create({ data: { providerId, action, status, message } });
}
/**
 * Real providers don't reliably honor the JAP-standard dialect's implied
 * "everything is a string" contract — smmgen.com, for one, returns
 * `service` (and sometimes rate/min/max) as raw JSON numbers, not strings.
 * axios/JSON.parse preserves whatever type the wire payload actually used,
 * so `ProviderServiceEntry.service: string` would otherwise be a lie at
 * runtime for exactly the providers this client exists to support —
 * silently breaking every `Map`/`===` lookup keyed on it (bulk import,
 * syncProviderCatalog) since `18801 !== "18801"` as a Map key. Normalizing
 * once here, at the single point every caller gets its data from, means
 * every consumer can trust the declared type without its own defensive
 * coercion.
 */
function normalizeServiceEntry(raw) {
    return {
        service: String(raw.service),
        name: String(raw.name ?? ""),
        category: raw.category !== undefined && raw.category !== null ? String(raw.category) : undefined,
        rate: String(raw.rate),
        min: String(raw.min),
        max: String(raw.max),
        refill: raw.refill,
        cancel: raw.cancel,
    };
}
export async function listProviderServices(provider) {
    // A full mega-panel catalog (smmgen.com alone has ~7,800 rows) is a
    // fundamentally larger, slower request than placing/checking one order —
    // 15s was tuned for those, not this.
    const raw = await postAction(provider, "services", {}, 45_000);
    if (!Array.isArray(raw)) {
        throw AppError.badRequest("Provider request failed (services): unexpected response shape (expected an array)");
    }
    return raw.map(normalizeServiceEntry);
}
export async function submitProviderOrder(provider, params) {
    const res = await postAction(provider, "add", params);
    return String(res.order);
}
export async function getProviderOrderStatus(provider, providerOrderId) {
    return postAction(provider, "status", { order: providerOrderId });
}
export async function getProviderOrderStatusBulk(provider, providerOrderIds) {
    return postAction(provider, "status", {
        orders: providerOrderIds.join(","),
    });
}
export async function getProviderBalance(provider) {
    return postAction(provider, "balance", {});
}
/** JAP-standard `action=refill` — requests a refill for one already-placed provider order. */
export async function submitProviderRefill(provider, providerOrderId) {
    const res = await postAction(provider, "refill", {
        order: providerOrderId,
    });
    if (res.refill === undefined) {
        throw AppError.badRequest("Provider refill request failed: unexpected response shape");
    }
    return String(res.refill);
}
/** JAP-standard `action=refill_status` — polled by cron/pollRefillStatus.ts. */
export async function getProviderRefillStatus(provider, providerRefillId) {
    return postAction(provider, "refill_status", { refill: providerRefillId });
}
/**
 * Same "unknown stays non-terminal" philosophy as mapProviderOrderStatus
 * above — we'd rather keep polling a refill we don't understand than wrongly
 * mark it completed or rejected.
 */
export function mapProviderRefillStatus(raw) {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "completed")
        return "COMPLETED";
    if (normalized === "rejected" || normalized === "error" || normalized === "canceled" || normalized === "cancelled") {
        return "REJECTED";
    }
    return "IN_PROGRESS";
}
/**
 * Maps a provider's free-text status string (the JAP-standard dialect isn't
 * strictly enumerated across implementations) to our own OrderStatus enum.
 * Unknown strings map to IN_PROGRESS rather than a terminal state — we'd
 * rather keep polling an order we don't understand than wrongly refund or
 * complete it.
 */
export function mapProviderOrderStatus(raw) {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "completed")
        return "COMPLETED";
    if (normalized === "partial")
        return "PARTIAL";
    if (normalized === "canceled" || normalized === "cancelled")
        return "CANCELED";
    if (normalized === "pending")
        return "PENDING";
    if (normalized === "processing")
        return "PROCESSING";
    return "IN_PROGRESS";
}
/** Loads a Provider row and returns it ready to pass to the functions above (still holding ciphertext — decrypted lazily per-call). */
export async function getProviderOrThrow(providerId) {
    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider)
        throw AppError.notFound("Provider not found");
    return provider;
}
