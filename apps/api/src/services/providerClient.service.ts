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
): Promise<T> {
  const apiKey = decrypt(provider.apiKeyCiphertext);
  const body = new URLSearchParams({ key: apiKey, action, ...stringifyParams(params) });

  try {
    const res = await axios.post(provider.apiUrl, body, {
      timeout: 15_000,
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

export async function listProviderServices(provider: { id: string; apiUrl: string; apiKeyCiphertext: string }) {
  return postAction<ProviderServiceEntry[]>(provider, "services", {});
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
