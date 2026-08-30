import axios from "axios";
import { prisma } from "../lib/prisma.js";
import { decrypt } from "../lib/crypto.js";
import { AppError } from "../utils/AppError.js";

/**
 * Client for the de facto "JAP-standard" SMM reseller API — a single POST
 * endpoint distinguished by an `action` form field, used by the large
 * majority of upstream SMM providers (JAP, SMMGen-style panels, etc.).
 * Every provider referenced in the design docs speaks this dialect, so this
 * client is written generically rather than against one specific vendor.
 */

export interface ProviderServiceEntry {
  service: string;
  name: string;
  category?: string;
  rate: string;
  min: string;
  max: string;
  refill?: boolean;
  cancel?: boolean;
  /** The provider's own package description — JAP-standard dialect calls this `desc`. */
  desc?: string;
}

export interface ProviderOrderStatus {
  charge?: string;
  start_count?: string;
  status: string;
  remains?: string;
  currency?: string;
}

async function postAction<T>(
  provider: { id: string; apiUrl: string; apiKeyCiphertext: string },
  action: string,
  params: Record<string, string | number>,
  timeoutMs = 15_000,
): Promise<T> {
  const apiKey = decrypt(provider.apiKeyCiphertext);
  const body = new URLSearchParams({ key: apiKey, action, ...stringifyParams(params) });

  try {
    const res = await axios.post(provider.apiUrl, body, {
      timeout: timeoutMs,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (res.data && typeof res.data === "object" && "error" in res.data) {
      throw new Error(String((res.data as { error: unknown }).error));
    }
    await logSync(provider.id, action, "SUCCESS", null);
    return res.data as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown provider error";
    await logSync(provider.id, action, "FAILURE", message);
    throw AppError.badRequest(`Provider request failed (${action}): ${message}`);
  }
}

function stringifyParams(params: Record<string, string | number>): Record<string, string> {
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]));
}

async function logSync(providerId: string, action: string, status: "SUCCESS" | "FAILURE", message: string | null) {
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
function normalizeServiceEntry(raw: Record<string, unknown>): ProviderServiceEntry {
  return {
    service: String(raw.service),
    name: String(raw.name ?? ""),
    category: raw.category !== undefined && raw.category !== null ? String(raw.category) : undefined,
    rate: String(raw.rate),
    min: String(raw.min),
    max: String(raw.max),
    refill: raw.refill as ProviderServiceEntry["refill"],
    cancel: raw.cancel as ProviderServiceEntry["cancel"],
    // A few providers use `description` instead of the JAP-standard `desc`
    // — accept either rather than silently dropping the detail.
    desc: raw.desc !== undefined && raw.desc !== null
      ? String(raw.desc)
      : raw.description !== undefined && raw.description !== null
        ? String(raw.description)
        : undefined,
  };
}

export async function listProviderServices(provider: { id: string; apiUrl: string; apiKeyCiphertext: string }) {
  // A full mega-panel catalog (smmgen.com alone has ~7,800 rows) is a
  // fundamentally larger, slower request than placing/checking one order —
  // 15s was tuned for those, not this.
  const raw = await postAction<Record<string, unknown>[]>(provider, "services", {}, 45_000);
  if (!Array.isArray(raw)) {
    throw AppError.badRequest("Provider request failed (services): unexpected response shape (expected an array)");
  }
  return raw.map(normalizeServiceEntry);
}

export async function submitProviderOrder(
  provider: { id: string; apiUrl: string; apiKeyCiphertext: string },
  params: { service: string; link: string; quantity: number },
) {
  const res = await postAction<{ order: string | number }>(provider, "add", params);
  return String(res.order);
}

export async function getProviderOrderStatus(
  provider: { id: string; apiUrl: string; apiKeyCiphertext: string },
  providerOrderId: string,
) {
  return postAction<ProviderOrderStatus>(provider, "status", { order: providerOrderId });
}

export async function getProviderOrderStatusBulk(
  provider: { id: string; apiUrl: string; apiKeyCiphertext: string },
  providerOrderIds: string[],
) {
  return postAction<Record<string, ProviderOrderStatus>>(provider, "status", {
    orders: providerOrderIds.join(","),
  });
}

export async function getProviderBalance(provider: { id: string; apiUrl: string; apiKeyCiphertext: string }) {
  return postAction<{ balance: string; currency: string }>(provider, "balance", {});
}

/** JAP-standard `action=refill` — requests a refill for one already-placed provider order. */
export async function submitProviderRefill(
  provider: { id: string; apiUrl: string; apiKeyCiphertext: string },
  providerOrderId: string,
): Promise<string> {
  const res = await postAction<{ refill?: string | number; error?: string }>(provider, "refill", {
    order: providerOrderId,
  });
  if (res.refill === undefined) {
    throw AppError.badRequest("Provider refill request failed: unexpected response shape");
  }
  return String(res.refill);
}

/**
 * JAP-standard `action=cancel` — requests cancellation of one already-placed
 * provider order. Some panels return `{ cancel: 1 }`, others an array of
 * per-order `{ order, cancel }` objects; anything without a top-level `error`
 * (already handled in postAction) is treated as accepted — the order-status
 * poll is what ultimately confirms the order actually moved to canceled.
 */
export async function submitProviderCancel(
  provider: { id: string; apiUrl: string; apiKeyCiphertext: string },
  providerOrderId: string,
): Promise<void> {
  await postAction<unknown>(provider, "cancel", { order: providerOrderId });
}

/** JAP-standard `action=refill_status` — polled by cron/pollRefillStatus.ts. */
export async function getProviderRefillStatus(
  provider: { id: string; apiUrl: string; apiKeyCiphertext: string },
  providerRefillId: string,
) {
  return postAction<{ status: string }>(provider, "refill_status", { refill: providerRefillId });
}

/**
 * Same "unknown stays non-terminal" philosophy as mapProviderOrderStatus
 * above — we'd rather keep polling a refill we don't understand than wrongly
 * mark it completed or rejected.
 */
export function mapProviderRefillStatus(raw: string): "IN_PROGRESS" | "COMPLETED" | "REJECTED" {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "completed") return "COMPLETED";
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
export function mapProviderOrderStatus(raw: string): "PENDING" | "PROCESSING" | "IN_PROGRESS" | "COMPLETED" | "PARTIAL" | "CANCELED" {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "completed") return "COMPLETED";
  if (normalized === "partial") return "PARTIAL";
  if (normalized === "canceled" || normalized === "cancelled") return "CANCELED";
  if (normalized === "pending") return "PENDING";
  if (normalized === "processing") return "PROCESSING";
  return "IN_PROGRESS";
}

/** Loads a Provider row and returns it ready to pass to the functions above (still holding ciphertext — decrypted lazily per-call). */
export async function getProviderOrThrow(providerId: string) {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw AppError.notFound("Provider not found");
  return provider;
}
