import { Prisma } from "#prisma/client";
import type { BulkImportProviderServicesInput } from "@smm/shared";
import { prisma } from "../lib/prisma.js";
import { getProviderOrThrow, listProviderServices, type ProviderServiceEntry } from "./providerClient.service.js";

/**
 * Bulk import — pulls a provider's full JAP-standard catalog (one HTTP call,
 * see providerClient.service.ts's listProviderServices) and turns it into
 * real Service + ServiceCategory rows, so an admin never has to hand-enter
 * hundreds/thousands of services from a mega-panel like mysmmgen.com one
 * at a time. Two calls: previewProviderImport() to show what would happen
 * before committing to anything, and bulkImportProviderServices() to
 * actually create rows for a chosen subset.
 */

// Recognized platform keywords, checked as a case-insensitive substring of
// the provider's own category string (e.g. "Instagram Followers | Real")
// to derive ServiceCategory.platform — the same badge PublicServices.tsx's
// platform filter chips group by. Falls back to "Other" rather than
// guessing wrong; an admin can always edit the category afterward from the
// Services page.
const KNOWN_PLATFORMS = [
  "Instagram",
  "Facebook",
  "TikTok",
  "YouTube",
  "Telegram",
  "Twitter",
  "Spotify",
  "SoundCloud",
  "LinkedIn",
  "Pinterest",
  "Twitch",
  "Discord",
  "Snapchat",
  "Threads",
  "WhatsApp",
];

function detectPlatform(categoryName: string): string {
  const lower = categoryName.toLowerCase();
  const match = KNOWN_PLATFORMS.find((p) => lower.includes(p.toLowerCase()));
  return match ?? "Other";
}

function toBool(value: unknown): boolean {
  return value === true || value === "1" || value === 1 || value === "true";
}

interface ParsedEntry {
  raw: ProviderServiceEntry;
  categoryName: string;
  platform: string;
  rate: number;
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  description: string | null;
}

// Matches serviceObjectSchema's description cap (packages/shared) — a
// provider's desc can run long (some paste full marketing copy), so this
// is a sanity ceiling, not a validation the import should ever fail on.
const MAX_DESCRIPTION_LENGTH = 2000;

export function parseDescription(desc: string | undefined): string | null {
  const trimmed = desc?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_DESCRIPTION_LENGTH);
}

/** Returns null (instead of throwing) for a row that can't be imported as-is, so one bad row never blocks the rest of a bulk import. */
function parseEntry(entry: ProviderServiceEntry): ParsedEntry | null {
  const rate = Number(entry.rate);
  const min = Number.parseInt(entry.min, 10);
  const max = Number.parseInt(entry.max, 10);
  if (!Number.isFinite(rate) || rate < 0) return null;
  if (!Number.isInteger(min) || !Number.isInteger(max) || min <= 0 || max < min) return null;

  const categoryName = (entry.category ?? "Uncategorized").trim().slice(0, 100) || "Uncategorized";
  return {
    raw: entry,
    categoryName,
    platform: detectPlatform(categoryName),
    rate,
    min,
    max,
    refill: toBool(entry.refill),
    cancel: toBool(entry.cancel),
    description: parseDescription(entry.desc),
  };
}

export interface ProviderImportPreviewRow {
  providerServiceId: string;
  name: string;
  description: string | null;
  category: string;
  platform: string;
  providerCostPer1000: string;
  minQuantity: number;
  maxQuantity: number;
  refillEnabled: boolean;
  cancelEnabled: boolean;
  alreadyImported: boolean;
  /** Set only when the row can't be imported as-is (bad rate/min/max from the provider). */
  invalidReason: string | null;
}

/** Read-only — fetches the provider's live catalog and marks what's already been imported, without creating anything. */
export async function previewProviderImport(providerId: string) {
  const provider = await getProviderOrThrow(providerId);
  const remoteServices = await listProviderServices(provider);

  const existing = await prisma.service.findMany({
    where: { providerId, providerServiceId: { not: null } },
    select: { providerServiceId: true },
  });
  const alreadyImportedIds = new Set(existing.map((s) => s.providerServiceId));

  const items: ProviderImportPreviewRow[] = remoteServices.map((entry) => {
    const parsed = parseEntry(entry);
    return {
      providerServiceId: entry.service,
      name: entry.name,
      description: parsed?.description ?? parseDescription(entry.desc),
      category: parsed?.categoryName ?? entry.category ?? "Uncategorized",
      platform: parsed?.platform ?? "Other",
      providerCostPer1000: parsed ? parsed.rate.toString() : entry.rate,
      minQuantity: parsed?.min ?? 0,
      maxQuantity: parsed?.max ?? 0,
      refillEnabled: parsed?.refill ?? false,
      cancelEnabled: parsed?.cancel ?? false,
      alreadyImported: alreadyImportedIds.has(entry.service),
      invalidReason: parsed ? null : "Provider returned an invalid rate or min/max for this service",
    };
  });

  return {
    total: items.length,
    alreadyImported: items.filter((i) => i.alreadyImported).length,
    invalid: items.filter((i) => i.invalidReason).length,
    importable: items.filter((i) => !i.alreadyImported && !i.invalidReason).length,
    items,
  };
}

export interface BulkImportResult {
  requested: number;
  imported: number;
  alreadySkipped: number;
  invalidSkipped: { providerServiceId: string; reason: string }[];
  notFoundSkipped: string[];
}

/**
 * Creates Service rows (auto-creating any ServiceCategory the batch needs)
 * for the requested subset of a provider's catalog. Idempotent by design —
 * re-running with the same (or overlapping) selection never duplicates a
 * row, because the actual guarantee is the DB's
 * @@unique([providerId, providerServiceId]) constraint via createMany's
 * skipDuplicates, not just the alreadyImported filtering done here (same
 * "app-level pre-check is a friendly UX layer, the DB constraint is the
 * real guard" pattern as manual deposits' trxId).
 */
export async function bulkImportProviderServices(
  providerId: string,
  input: BulkImportProviderServicesInput,
): Promise<BulkImportResult> {
  const provider = await getProviderOrThrow(providerId);
  const remoteServices = await listProviderServices(provider);
  const remoteById = new Map(remoteServices.map((s) => [s.service, s]));

  const requestedIds = new Set(input.providerServiceIds);
  const notFoundSkipped = input.providerServiceIds.filter((id) => !remoteById.has(id));

  const invalidSkipped: { providerServiceId: string; reason: string }[] = [];
  const parsedByServiceId = new Map<string, ParsedEntry>();
  for (const id of requestedIds) {
    const remote = remoteById.get(id);
    if (!remote) continue;
    const parsed = parseEntry(remote);
    if (!parsed) {
      invalidSkipped.push({ providerServiceId: id, reason: "Invalid rate or min/max from provider" });
      continue;
    }
    parsedByServiceId.set(id, parsed);
  }

  // Resolve categories once for the whole batch: dedupe by name
  // (case-insensitive) against what already exists, then create only the
  // genuinely new ones — avoids "Instagram Followers" vs
  // "instagram followers" ending up as two separate categories.
  const existingCategories = await prisma.serviceCategory.findMany();
  const categoryIdByLowerName = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]));

  const neededCategoryNames = new Map<string, string>(); // lowercase -> original casing
  for (const parsed of parsedByServiceId.values()) {
    const lower = parsed.categoryName.toLowerCase();
    if (!categoryIdByLowerName.has(lower) && !neededCategoryNames.has(lower)) {
      neededCategoryNames.set(lower, parsed.categoryName);
    }
  }

  for (const [lower, original] of neededCategoryNames) {
    const platform = detectPlatform(original);
    const created = await prisma.serviceCategory.create({ data: { name: original, platform } });
    categoryIdByLowerName.set(lower, created.id);
  }

  const rows: Prisma.ServiceCreateManyInput[] = Array.from(parsedByServiceId.entries()).map(([id, parsed]) => {
    const categoryId = categoryIdByLowerName.get(parsed.categoryName.toLowerCase())!;
    const sellPricePer1000 = Math.round(parsed.rate * (1 + input.markupPercent / 100) * 10_000) / 10_000;
    return {
      categoryId,
      providerId,
      providerServiceId: id,
      name: parsed.raw.name.slice(0, 200),
      description: parsed.description,
      sellPricePer1000: new Prisma.Decimal(sellPricePer1000),
      providerCostPer1000: new Prisma.Decimal(parsed.rate),
      minQuantity: parsed.min,
      maxQuantity: parsed.max,
      refillEnabled: parsed.refill,
      cancelEnabled: parsed.cancel,
      status: "ACTIVE",
      autoSubmit: input.autoSubmit,
    };
  });

  let imported = 0;
  if (rows.length > 0) {
    const result = await prisma.service.createMany({ data: rows, skipDuplicates: true });
    imported = result.count;
  }

  await prisma.provider.update({ where: { id: provider.id }, data: { lastSyncAt: new Date() } });

  return {
    requested: input.providerServiceIds.length,
    imported,
    alreadySkipped: rows.length - imported,
    invalidSkipped,
    notFoundSkipped,
  };
}
