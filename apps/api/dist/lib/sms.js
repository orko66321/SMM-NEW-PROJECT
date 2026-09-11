import { computeSmsSegments } from "@smm/shared";
import { getSmsConfig } from "../services/settings.service.js";
import { logger } from "./logger.js";
/**
 * Two supported SMS gateways, dispatched on the admin-selected
 * `SiteSettings.smsProvider` (see services/settings.service.ts's
 * getSmsConfig) — same multi-provider shape as lib/mailer.ts's
 * Resend/Brevo/SMTP, so everything downstream (notifications.service.ts,
 * the admin SMS Campaigns broadcaster) just calls sendSms() and never
 * cares which one is actually active:
 *
 *  - URONTO  (https://urontosms.hostgi.com) — GET with `key`/`number`/`msg`
 *    query params.
 *  - MILEJET (https://api.milejet.com by default, admin-overridable) — POST
 *    JSON {api_key, secret_key, sender_id, contacts, msg, type}, where
 *    `type` ('text' | 'unicode') is auto-detected from the message, not
 *    admin-set — see smsTypeFor() below.
 */
const URONTO_SMS_API_URL = "https://urontosms.hostgi.com/api/sms";
// NOT confirmed against uronto SMS's actual API docs — a common convention
// for this style of BD bulk-SMS panel, used as a best guess for the admin
// "remaining balance" widget (routes/admin/sms.routes.ts's GET /balance).
// getSmsBalance() below degrades to `{ available: false }` on any failure
// (wrong path, unexpected shape, timeout) rather than showing a wrong
// number, so a bad guess here never blocks sending — only hides the widget.
// Confirm the real path/response shape with uronto SMS and adjust if this
// keeps coming back unavailable. MiLeJet has no balance check for now —
// their spec (unlike uronto's) didn't include one.
const URONTO_BALANCE_API_URL = "https://urontosms.hostgi.com/api/balance";
const MILEJET_DEFAULT_API_URL = "https://api.milejet.com/api/v1/sms/send";
/** True when the admin has enabled SMS and fully configured the active provider. */
export async function isSmsConfigured() {
    return (await getSmsConfig()) !== null;
}
/**
 * uronto SMS expects a local Bangladeshi number (e.g. "01700000000"), not
 * the +880/880 international form a user might type into Profile/Register.
 * Strips everything but digits and folds a leading country code back down
 * to the 0-prefixed local form; anything else is passed through as-is so an
 * unexpected format still reaches the API (and its error) rather than being
 * silently mangled further. Applied for both providers — MiLeJet's spec
 * uses the same local format.
 */
export function normalizeBdPhone(raw) {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("880") && digits.length === 13)
        return `0${digits.slice(3)}`;
    if (digits.length === 10)
        return `0${digits}`;
    return digits;
}
/**
 * MiLeJet's `type` field — reuses computeSmsSegments' GSM-7 detection
 * (packages/shared, already the one source of truth for the admin
 * composer's live character/segment counter) rather than a second,
 * narrower "is this Bangla" regex: anything that isn't plain GSM-7 text
 * needs `unicode` billing regardless of which non-GSM-7 script it is.
 */
function smsTypeFor(message) {
    return computeSmsSegments(message).encoding === "GSM7" ? "text" : "unicode";
}
async function sendViaUronto(apiKey, number, message) {
    const url = new URL(URONTO_SMS_API_URL);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("number", number);
    url.searchParams.set("msg", message);
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
}
async function sendViaMilejet(config, number, message) {
    const res = await fetch(config.apiUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            api_key: config.apiKey,
            secret_key: config.secretKey,
            sender_id: config.senderId,
            contacts: number,
            msg: message,
            type: smsTypeFor(message),
        }),
        signal: AbortSignal.timeout(15_000),
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
}
/**
 * Sends via whichever provider is active and returns the raw result either
 * way — never throws, so the admin "Live Tester" (routes/admin/settings.routes.ts's
 * POST /test-sms) can show the exact provider response, success or failure.
 * `sendSms()` below is the throwing wrapper every other caller uses.
 */
export async function sendSmsRaw(to, message) {
    const config = await getSmsConfig();
    if (!config) {
        logger.warn({ to, message }, "SMS not configured — logging instead of sending");
        return null;
    }
    const number = normalizeBdPhone(to);
    try {
        const result = config.provider === "MILEJET"
            ? await sendViaMilejet(config.milejet, number, message)
            : await sendViaUronto(config.uronto.apiKey, number, message);
        if (result.ok)
            logger.info({ provider: config.provider, number, body: result.body }, "SMS sent");
        else
            logger.error({ provider: config.provider, status: result.status, body: result.body, number }, "SMS API rejected the message");
        return result;
    }
    catch (err) {
        logger.error({ err, provider: config.provider, number }, "SMS API request failed");
        return { ok: false, status: 0, body: err instanceof Error ? err.message : String(err) };
    }
}
export async function sendSms(to, message) {
    const result = await sendSmsRaw(to, message);
    if (!result)
        return; // not configured — already logged
    if (!result.ok) {
        throw new Error(`SMS API error ${result.status}: ${JSON.stringify(result.body).slice(0, 300)}`);
    }
}
/**
 * Best-effort remaining-credit lookup for the admin SMS Campaigns balance
 * widget — see URONTO_BALANCE_API_URL's comment above for why this is
 * defensive rather than trusted. URONTO only; MiLeJet has none configured.
 * Never throws.
 */
export async function getSmsBalance() {
    const config = await getSmsConfig();
    if (!config || config.provider !== "URONTO")
        return { available: false };
    try {
        const url = new URL(URONTO_BALANCE_API_URL);
        url.searchParams.set("key", config.uronto.apiKey);
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok)
            return { available: false };
        const body = await res.json().catch(() => null);
        if (!body || typeof body !== "object")
            return { available: false };
        // Accept whichever of these keys the provider actually uses.
        const raw = body.balance ?? body.credit ?? body.sms_count;
        const balance = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
        if (!Number.isFinite(balance))
            return { available: false };
        return { available: true, balance };
    }
    catch (err) {
        logger.warn({ err }, "SMS balance lookup failed — hiding the widget instead of showing a wrong number");
        return { available: false };
    }
}
export { MILEJET_DEFAULT_API_URL };
