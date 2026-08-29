import nodemailer from "nodemailer";
import { getSmtpConfig } from "../services/settings.service.js";
import { logger } from "./logger.js";

/**
 * SMTP is admin-configured (Settings page → Site Settings), not env-based —
 * same "add/rotate from the UI, not a redeploy" philosophy as payment
 * gateways (see services/payments/config.service.ts). No real mail account
 * exists yet by default, so if SMTP is left disabled/unconfigured, email is
 * not silently dropped: the content is logged instead, so flows like
 * password reset still work end-to-end in dev without a mail server (see
 * README "What's still not live").
 */
export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const config = await getSmtpConfig();
  if (!config) {
    logger.warn({ to, subject, text }, "SMTP not configured — logging email instead of sending");
    return;
  }

  const secure = config.port === 465;
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure, // 465 = implicit TLS; anything else starts plain and upgrades
    requireTLS: !secure, // for 587/25, refuse to send if STARTTLS isn't offered
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    // Fail fast with a real error instead of hanging the request if the host
    // is unreachable or wrong.
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    // Shared-hosting (cPanel) mail servers very commonly present a TLS
    // certificate whose hostname doesn't match the `host` you connect to
    // (the cert is for e.g. serverNNN.web-hosting.com but mail is reached via
    // mail.yourdomain.com). nodemailer's default strict verification then
    // rejects the connection outright ("self signed certificate" / "unable to
    // verify the first certificate"). Relaxing verification is the standard
    // workaround for that setup; the SMTP submission hop is still encrypted
    // and authenticated, and the app only ever sends its own transactional
    // mail over it.
    tls: { rejectUnauthorized: false },
  });

  try {
    await transporter.sendMail({ from: config.from, to, subject, text });
  } catch (err) {
    // Log the full error server-side (host, code, response) for debugging,
    // then rethrow so callers (e.g. the admin "send test email" action) can
    // surface a short message to the operator.
    logger.error({ err, host: config.host, port: config.port }, "SMTP send failed");
    throw err;
  }
}
