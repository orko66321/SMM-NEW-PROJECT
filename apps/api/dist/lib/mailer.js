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
export async function sendMail(to, subject, text) {
    const config = await getSmtpConfig();
    if (!config) {
        logger.warn({ to, subject, text }, "SMTP not configured — logging email instead of sending");
        return;
    }
    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    });
    await transporter.sendMail({ from: config.from, to, subject, text });
}
