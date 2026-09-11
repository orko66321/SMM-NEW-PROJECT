import { getSmsConfig, getEmailNotificationConfig } from "./settings.service.js";
import { sendSms } from "../lib/sms.js";
import { sendMail } from "../lib/mailer.js";
import { logger } from "../lib/logger.js";

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

async function fireEmail(kind: string, to: string, subject: string, body: string): Promise<void> {
  try {
    await sendMail(to, subject, body);
  } catch (err) {
    logger.error({ err, kind, to }, "Notification email failed");
  }
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
