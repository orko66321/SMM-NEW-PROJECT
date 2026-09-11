import { getSmsConfig } from "../services/settings.service.js";
import { logger } from "./logger.js";

/**
 * uronto SMS (https://urontosms.hostgi.com) — a plain GET request with
 * `key` / `number` / `msg` query params, admin-configured from Settings →
 * SMS Notifications (see services/settings.service.ts's getSmsConfig).
 * There's no HTTPS-provider fallback like lib/mailer.ts's Resend/Brevo —
 * this is the one supported gateway for now.
 */

const SMS_API_URL = "https://urontosms.hostgi.com/api/sms";
// NOT confirmed against uronto SMS's actual API docs — a common convention
// for this style of BD bulk-SMS panel, used as a best guess for the admin
// "remaining balance" widget (routes/admin/sms.routes.ts's GET /balance).
// getSmsBalance() below degrades to `{ available: false }` on any failure
// (wrong path, unexpected shape, timeout) rather than showing a wrong
// number, so a bad guess here never blocks sending — only hides the widget.
// Confirm the real path/response shape with uronto SMS and adjust if this
// keeps coming back unavailable.
const SMS_BALANCE_API_URL = "https://urontosms.hostgi.com/api/balance";

/** True when the admin has enabled SMS and saved an API key. */
export async function isSmsConfigured(): Promise<boolean> {
  return (await getSmsConfig()) !== null;
}

/**
 * uronto SMS expects a local Bangladeshi number (e.g. "01700000000"), not
 * the +880/880 international form a user might type into Profile/Register.
 * Strips everything but digits and folds a leading country code back down
 * to the 0-prefixed local form; anything else is passed through as-is so an
 * unexpected format still reaches the API (and its error) rather than being
 * silently mangled further.
 */
export function normalizeBdPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length === 13) return `0${digits.slice(3)}`;
  if (digits.length === 10) return `0${digits}`;
  return digits;
}

export async function sendSms(to: string, message: string): Promise<void> {
  const config = await getSmsConfig();
  if (!config) {
    logger.warn({ to, message }, "SMS not configured — logging instead of sending");
    return;
  }

  const number = normalizeBdPhone(to);
  const url = new URL(SMS_API_URL);
  url.searchParams.set("key", config.apiKey);
  url.searchParams.set("number", number);
  url.searchParams.set("msg", message);

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  } catch (err) {
    logger.error({ err, number }, "SMS API request failed");
    throw new Error(err instanceof Error ? `SMS API request failed: ${err.message}` : "SMS API request failed");
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    logger.error({ status: res.status, body, number }, "SMS API rejected the message");
    throw new Error(`SMS API error ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  }
  logger.info({ number, body }, "SMS sent");
}

/**
 * Best-effort remaining-credit lookup for the admin SMS Campaigns balance
 * widget — see SMS_BALANCE_API_URL's comment above for why this is
 * defensive rather than trusted. Never throws.
 */
export async function getSmsBalance(): Promise<{ available: boolean; balance?: number }> {
  const config = await getSmsConfig();
  if (!config) return { available: false };

  try {
    const url = new URL(SMS_BALANCE_API_URL);
    url.searchParams.set("key", config.apiKey);
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { available: false };
    const body: unknown = await res.json().catch(() => null);
    if (!body || typeof body !== "object") return { available: false };
    // Accept whichever of these keys the provider actually uses.
    const raw = (body as Record<string, unknown>).balance ?? (body as Record<string, unknown>).credit ?? (body as Record<string, unknown>).sms_count;
    const balance = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    if (!Number.isFinite(balance)) return { available: false };
    return { available: true, balance };
  } catch (err) {
    logger.warn({ err }, "SMS balance lookup failed — hiding the widget instead of showing a wrong number");
    return { available: false };
  }
}
