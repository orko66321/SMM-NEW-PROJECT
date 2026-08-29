import nodemailer from "nodemailer";
import { getSmtpConfig } from "../services/settings.service.js";
import { env } from "../env.js";
import { logger } from "./logger.js";

/**
 * Two ways to send:
 *
 *  1. Brevo transactional API over HTTPS — used when BREVO_API_KEY is set on
 *     the API server. Preferred on a cloud host (Railway): shared-hosting
 *     (cPanel) SMTP servers are routinely unreachable from a datacenter IP
 *     (the SMTP ports time out at a firewall), while an HTTPS call on 443
 *     always gets through. Requires MAIL_FROM = a Brevo-verified sender.
 *
 *  2. SMTP — admin-configured (Settings page → Site Settings), not env-based.
 *     Same "add/rotate from the UI, not a redeploy" philosophy as payment
 *     gateways.
 *
 * If neither is configured, email isn't silently dropped: the content is
 * logged instead, so flows like password reset still work end-to-end in dev
 * without a mail server.
 */

/** True when at least one transport (Brevo API or full SMTP settings) is usable. */
export async function isMailConfigured(): Promise<boolean> {
  if (env.brevoEmailEnabled) return true;
  return (await getSmtpConfig()) !== null;
}

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
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

async function sendViaBrevo(to: string, subject: string, text: string): Promise<void> {
  if (!env.MAIL_FROM) {
    throw new Error("BREVO_API_KEY is set but MAIL_FROM is not — set MAIL_FROM to your Brevo-verified sender address");
  }

  let res: Response;
  try {
    res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY as string,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: env.MAIL_FROM },
        to: [{ email: to }],
        subject,
        textContent: text,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    logger.error({ err }, "Brevo API request failed");
    throw new Error(err instanceof Error ? `Brevo API request failed: ${err.message}` : "Brevo API request failed");
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    logger.error({ status: res.status, detail }, "Brevo API rejected the email");
    // Brevo returns { code, message } — surface it so the operator can fix
    // the sender/key without digging through logs.
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
