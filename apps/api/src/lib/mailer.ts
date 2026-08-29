import nodemailer from "nodemailer";
import { getSmtpConfig } from "../services/settings.service.js";
import { env } from "../env.js";
import { logger } from "./logger.js";

/**
 * Ways to send, in priority order:
 *
 *  1. Resend HTTPS API      — when RESEND_API_KEY is set
 *  2. Brevo HTTPS API       — when BREVO_API_KEY is set
 *  3. SMTP                  — admin-configured (Settings → Site Settings)
 *
 * The HTTPS providers are preferred on a cloud host (Railway): shared-hosting
 * (cPanel) SMTP servers are routinely unreachable from a datacenter IP — the
 * SMTP ports time out at a firewall — while an HTTPS call on 443 always gets
 * through. Both need MAIL_FROM = a sender address verified with that provider.
 *
 * If nothing is configured, email isn't silently dropped: the content is
 * logged instead, so flows like password reset still work end-to-end in dev
 * without a mail server.
 */

/** True when at least one transport (an HTTPS provider, or full SMTP settings) is usable. */
export async function isMailConfigured(): Promise<boolean> {
  if (env.httpMailEnabled) return true;
  return (await getSmtpConfig()) !== null;
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

  const config = await getSmtpConfig();
  if (!config) {
    logger.warn({ to, subject, text }, "Email not configured — logging instead of sending");
    return;
  }
  await sendViaSmtp(config, to, subject, text);
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

async function sendViaSmtp(
  config: NonNullable<Awaited<ReturnType<typeof getSmtpConfig>>>,
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  const secure = config.port === 465;
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure, // 465 = implicit TLS; anything else starts plain and upgrades
    requireTLS: !secure, // for 587/25, refuse to send if STARTTLS isn't offered
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    // Fail fast with a real error instead of hanging the request.
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    // Shared-hosting mail servers commonly present a certificate whose
    // hostname doesn't match `host`; strict verification then rejects the
    // connection. The submission hop is still encrypted + authenticated.
    tls: { rejectUnauthorized: false },
  });

  try {
    await transporter.sendMail({ from: config.from, to, subject, text });
  } catch (err) {
    logger.error({ err, host: config.host, port: config.port }, "SMTP send failed");
    throw err;
  }
}
