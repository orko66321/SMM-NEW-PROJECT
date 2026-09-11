import { getMailjetConfig } from "../services/settings.service.js";
import { env } from "../env.js";
import { logger } from "./logger.js";

/**
 * Ways to send, in priority order:
 *
 *  1. Resend HTTPS API      — when RESEND_API_KEY is set
 *  2. Brevo HTTPS API       — when BREVO_API_KEY is set
 *  3. Mailjet HTTPS API     — admin-configured (Settings → Site Settings)
 *
 * All three are plain HTTPS calls, deliberately — this runs on a
 * cPanel/shared-hosting host, and outbound SMTP (25/465/587) is routinely
 * blocked or throttled there while 443 always gets through. This used to
 * be SMTP-to-Mailjet (in-v3.mailjet.com:587) via nodemailer; that's exactly
 * the failure mode that made it unreliable, so it's now their HTTP Send
 * API v3.1 instead — same two credentials (API key / secret key), just a
 * POST instead of an SMTP session.
 *
 * If nothing is configured, email isn't silently dropped: the content is
 * logged instead, so flows like password reset still work end-to-end in dev
 * without a mail server.
 */

/** True when at least one transport (an HTTPS provider, or Mailjet) is usable. */
export async function isMailConfigured(): Promise<boolean> {
  if (env.httpMailEnabled) return true;
  return (await getMailjetConfig()) !== null;
}

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  if (env.RESEND_API_KEY) {
    await sendViaResend(to, subject, text);
    return;
  }
  if (env.BREVO_API_KEY) {
    await sendViaBrevo(to, subject, text);
    return;
  }

  const config = await getMailjetConfig();
  if (!config) {
    logger.warn({ to, subject, text }, "Email not configured — logging instead of sending");
    return;
  }
  await sendViaMailjet(config, to, subject, text);
}

function requireMailFrom(keyName: string): string {
  if (!env.MAIL_FROM) {
    throw new Error(`${keyName} is set but MAIL_FROM is not — set MAIL_FROM to your verified sender address`);
  }
  return env.MAIL_FROM;
}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<Response> {
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    logger.error({ err, url }, "Email API request failed");
    throw new Error(err instanceof Error ? `Email API request failed: ${err.message}` : "Email API request failed");
  }
}

async function sendViaResend(to: string, subject: string, text: string): Promise<void> {
  const from = requireMailFrom("RESEND_API_KEY");
  const res = await postJson(
    "https://api.resend.com/emails",
    { authorization: `Bearer ${env.RESEND_API_KEY as string}` },
    { from, to: [to], subject, text },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    logger.error({ status: res.status, detail }, "Resend API rejected the email");
    throw new Error(`Resend API error ${res.status}: ${detail.slice(0, 300)}`);
  }
}

async function sendViaBrevo(to: string, subject: string, text: string): Promise<void> {
  const from = requireMailFrom("BREVO_API_KEY");
  const res = await postJson(
    "https://api.brevo.com/v3/smtp/email",
    { "api-key": env.BREVO_API_KEY as string, accept: "application/json" },
    { sender: { email: from }, to: [{ email: to }], subject, textContent: text },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    logger.error({ status: res.status, detail }, "Brevo API rejected the email");
    throw new Error(`Brevo API error ${res.status}: ${detail.slice(0, 300)}`);
  }
}

/** Pulls whatever error text Mailjet actually sent back, however that particular failure shaped it. */
function extractMailjetError(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const b = body as Record<string, unknown>;
  // Auth/request-level failures: {"ErrorMessage": "..."} (or "Message").
  if (typeof b.ErrorMessage === "string") return b.ErrorMessage;
  if (typeof b.Message === "string") return b.Message;
  // Per-message failures: {"Messages": [{"Status": "error", "Errors": [{"ErrorMessage": "..."}]}]}
  const messages = Array.isArray(b.Messages) ? b.Messages : [];
  for (const m of messages) {
    const errors = m && typeof m === "object" && Array.isArray((m as Record<string, unknown>).Errors) ? (m as Record<string, unknown>).Errors as unknown[] : [];
    for (const e of errors) {
      if (e && typeof e === "object" && typeof (e as Record<string, unknown>).ErrorMessage === "string") {
        return (e as Record<string, unknown>).ErrorMessage as string;
      }
    }
  }
  return "";
}

/**
 * Mailjet Send API v3.1 (https://dev.mailjet.com/email/reference/send-emails/)
 * — HTTP Basic Auth (API key / secret key), one retry on a transient
 * failure (network error or 5xx — Mailjet's own fault, worth one more try)
 * since this sits on a few live user-facing paths (password reset, order/
 * deposit notifications). A 4xx never retries — that's a config problem
 * (bad key, unverified sender) a second identical request won't fix.
 */
async function sendViaMailjet(
  config: NonNullable<Awaited<ReturnType<typeof getMailjetConfig>>>,
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  const auth = Buffer.from(`${config.apiKey}:${config.secretKey}`).toString("base64");
  const payload = {
    Messages: [
      {
        From: { Email: config.from, Name: config.fromName },
        To: [{ Email: to }],
        Subject: subject,
        TextPart: text,
      },
    ],
  };

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let res: Response;
    try {
      res = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Basic ${auth}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      lastErr = err;
      logger.warn({ err, attempt }, "Mailjet API request failed — network/timeout");
      continue; // transient — try once more
    }

    const body: unknown = await res.json().catch(() => null);
    if (res.ok) return;

    const detail = extractMailjetError(body) || JSON.stringify(body).slice(0, 300);
    if (res.status >= 400 && res.status < 500) {
      // Config problem, not a transient failure — fail fast with the real reason.
      logger.error({ status: res.status, detail }, "Mailjet API rejected the email");
      throw new Error(`Mailjet API error ${res.status}: ${detail}`);
    }
    lastErr = new Error(`Mailjet API error ${res.status}: ${detail}`);
    logger.warn({ status: res.status, detail, attempt }, "Mailjet API server error — retrying once");
  }

  logger.error({ err: lastErr }, "Mailjet send failed after retry");
  throw lastErr instanceof Error ? lastErr : new Error("Mailjet send failed after retry");
}
