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
