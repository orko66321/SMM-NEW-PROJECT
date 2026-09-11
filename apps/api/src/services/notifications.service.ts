import { getSmsConfig, getEmailNotificationConfig } from "./settings.service.js";
import { sendSms } from "../lib/sms.js";
import { sendMail } from "../lib/mailer.js";
import { logger } from "../lib/logger.js";
import { env } from "../env.js";

/**
 * Event-triggered notifications (welcome / add-fund / order) across both
 * channels — SMS (lib/sms.ts, uronto SMS) and email (lib/mailer.ts,
 * whichever transport is configured). Every exported function here is
 * deliberately best-effort: it never throws or rejects, so a slow/
 * misconfigured/down gateway (or even a transient DB error reading the
 * settings row) can never fail or roll back the registration, deposit, or
 * order flow that triggered it, and can never surface as an unhandled
 * rejection from the `void notifyX(...)` fire-and-forget call sites use.
 * Call these AFTER the triggering DB transaction has committed, never from
 * inside one — a network call has no place holding a Postgres transaction
 * open.
 *
 * `guarded` is the outer safety net (catches a failure reading settings,
 * not just a failure sending); `fireSms`/`fireEmail` are the inner one, so
 * within a single event a broken SMS template can never suppress the email
 * for that same event, or vice versa.
 */

type NotifiableUser = { username: string; email: string; phone: string | null };

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? "");
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

async function guarded(kind: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    logger.error({ err, kind }, "Notification dispatch failed");
  }
}

async function fireSms(kind: string, to: string, message: string): Promise<void> {
  try {
    await sendSms(to, message);
  } catch (err) {
    logger.error({ err, kind, to }, "Notification SMS failed");
  }
}

async function fireEmail(kind: string, to: string, subject: string, body: string, html?: string): Promise<void> {
  try {
    await sendMail(to, subject, body, html);
  } catch (err) {
    logger.error({ err, kind, to }, "Notification email failed");
  }
}

/** Minimal HTML-escaping for the one place here that inlines user/admin-authored text into an HTML email body. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function notifyWelcome(user: NotifiableUser): Promise<void> {
  await guarded("welcome", async () => {
    const [sms, email] = await Promise.all([getSmsConfig(), getEmailNotificationConfig()]);

    if (user.phone && sms?.welcomeEnabled) {
      const message = renderTemplate(sms.welcomeTemplate, { siteName: sms.siteName, username: user.username });
      await fireSms("welcome", user.phone, message);
    }
    if (email.welcomeEnabled) {
      const vars = { siteName: email.siteName, username: user.username };
      await fireEmail(
        "welcome",
        user.email,
        renderTemplate(email.welcomeSubject, vars),
        renderTemplate(email.welcomeTemplate, vars),
      );
    }
  });
}

export async function notifyAddFundSuccess(
  user: NotifiableUser,
  params: { amount: number; balance: number },
): Promise<void> {
  await guarded("add-fund-success", async () => {
    const [sms, email] = await Promise.all([getSmsConfig(), getEmailNotificationConfig()]);
    const vars = { amount: formatUsd(params.amount), balance: formatUsd(params.balance) };

    if (user.phone && sms?.addFundEnabled) {
      const message = renderTemplate(sms.addFundTemplate, { siteName: sms.siteName, username: user.username, ...vars });
      await fireSms("add-fund-success", user.phone, message);
    }
    if (email.addFundSuccessEnabled) {
      const emailVars = { siteName: email.siteName, username: user.username, ...vars };
      await fireEmail(
        "add-fund-success",
        user.email,
        renderTemplate(email.addFundSuccessSubject, emailVars),
        renderTemplate(email.addFundSuccessTemplate, emailVars),
      );
    }
  });
}

/** SMS has no "deposit rejected" message of its own (out of scope when the SMS feature shipped) — email only. */
export async function notifyAddFundFailed(user: NotifiableUser, params: { amount: number }): Promise<void> {
  await guarded("add-fund-failed", async () => {
    const email = await getEmailNotificationConfig();
    if (!email.addFundFailedEnabled) return;
    const vars = { siteName: email.siteName, username: user.username, amount: formatUsd(params.amount) };
    await fireEmail(
      "add-fund-failed",
      user.email,
      renderTemplate(email.addFundFailedSubject, vars),
      renderTemplate(email.addFundFailedTemplate, vars),
    );
  });
}

export async function notifyOrderSuccess(
  user: NotifiableUser,
  params: { orderId: string; service: string; quantity: number },
): Promise<void> {
  await guarded("order-success", async () => {
    const [sms, email] = await Promise.all([getSmsConfig(), getEmailNotificationConfig()]);
    const vars = { orderId: params.orderId, service: params.service, quantity: String(params.quantity) };

    if (user.phone && sms?.orderConfirmationEnabled) {
      const message = renderTemplate(sms.orderConfirmationTemplate, { siteName: sms.siteName, username: user.username, ...vars });
      await fireSms("order-success", user.phone, message);
    }
    if (email.orderSuccessEnabled) {
      const emailVars = { siteName: email.siteName, username: user.username, ...vars };
      await fireEmail(
        "order-success",
        user.email,
        renderTemplate(email.orderSuccessSubject, emailVars),
        renderTemplate(email.orderSuccessTemplate, emailVars),
      );
    }
  });
}

/** SMS has no "order failed" message of its own (out of scope when the SMS feature shipped) — email only. */
export async function notifyOrderFailed(
  user: NotifiableUser,
  params: { orderId: string; service: string; refundAmount: number },
): Promise<void> {
  await guarded("order-failed", async () => {
    const email = await getEmailNotificationConfig();
    if (!email.orderFailedEnabled) return;
    const vars = {
      siteName: email.siteName,
      username: user.username,
      orderId: params.orderId,
      service: params.service,
      refundAmount: formatUsd(params.refundAmount),
    };
    await fireEmail(
      "order-failed",
      user.email,
      renderTemplate(email.orderFailedSubject, vars),
      renderTemplate(email.orderFailedTemplate, vars),
    );
  });
}

/**
 * Ticket "you got a reply" email — sent to the ticket owner whenever an
 * agent posts a reply (services/ticket.service.ts's addAdminMessage), never
 * on ticket creation and never for the user's own replies.
 *
 * Deliberately NOT routed through getEmailNotificationConfig()'s
 * admin-editable subject/body templates like the other notifyX functions
 * above — the content here (reply text, ticket number, a link back to that
 * exact ticket) is inherently per-ticket, not a fixed template with a
 * handful of {{vars}}, so it's built directly. `siteName` still comes from
 * settings so the wording stays in sync with the rest of the panel.
 */
export async function notifyTicketReply(
  user: { username: string; email: string | null | undefined },
  params: { ticketId: string; ticketSubject: string; replyBody: string },
): Promise<void> {
  await guarded("ticket-reply", async () => {
    if (!user.email) {
      logger.warn({ ticketId: params.ticketId }, "Ticket reply email skipped — user has no email on file");
      return;
    }

    const { siteName } = await getEmailNotificationConfig();
    const ticketUrl = `${env.FRONTEND_BASE_URL}/dashboard/tickets/${params.ticketId}`;
    const subject = `Re: [Ticket #${params.ticketId}] ${params.ticketSubject}`;

    const text = [
      `Hi ${user.username},`,
      "",
      `${siteName} support replied to your ticket:`,
      "",
      params.replyBody,
      "",
      `Ticket: #${params.ticketId} — ${params.ticketSubject}`,
      `View and reply: ${ticketUrl}`,
    ].join("\n");

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f1f29">
        <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:20px 24px;border-radius:12px 12px 0 0">
          <span style="font-size:15px;font-weight:700;color:#fff;letter-spacing:.04em">${escapeHtml(siteName)}</span>
        </div>
        <div style="border:1px solid #e4e1f0;border-top:none;border-radius:0 0 12px 12px;padding:24px">
          <p style="margin:0 0 14px;font-size:15px">Hi ${escapeHtml(user.username)},</p>
          <p style="margin:0 0 16px;font-size:15px">Our support team replied to your ticket:</p>
          <div style="background:#f5f3ff;border-left:3px solid #7c3aed;border-radius:6px;padding:14px 16px;margin:0 0 18px;font-size:14px;white-space:pre-wrap">${escapeHtml(params.replyBody)}</div>
          <p style="margin:0 0 4px;font-size:13px;color:#6b6b85">Ticket #${escapeHtml(params.ticketId)}</p>
          <p style="margin:0 0 20px;font-size:13px;color:#6b6b85">${escapeHtml(params.ticketSubject)}</p>
          <a href="${ticketUrl}" style="display:inline-block;background:linear-gradient(120deg,#8b5cf6,#7c3aed 55%,#c026d3);color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:999px">View &amp; reply</a>
        </div>
      </div>`;

    await fireEmail("ticket-reply", user.email, subject, text, html);
  });
}
