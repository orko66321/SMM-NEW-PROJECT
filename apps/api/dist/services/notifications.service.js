import { getSmsConfig, getEmailNotificationConfig } from "./settings.service.js";
import { sendSms } from "../lib/sms.js";
import { sendMail } from "../lib/mailer.js";
import { logger } from "../lib/logger.js";
function renderTemplate(template, vars) {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => vars[key] ?? "");
}
function formatUsd(amount) {
    return `$${amount.toFixed(2)}`;
}
async function guarded(kind, fn) {
    try {
        await fn();
    }
    catch (err) {
        logger.error({ err, kind }, "Notification dispatch failed");
    }
}
async function fireSms(kind, to, message) {
    try {
        await sendSms(to, message);
    }
    catch (err) {
        logger.error({ err, kind, to }, "Notification SMS failed");
    }
}
async function fireEmail(kind, to, subject, body) {
    try {
        await sendMail(to, subject, body);
    }
    catch (err) {
        logger.error({ err, kind, to }, "Notification email failed");
    }
}
export async function notifyWelcome(user) {
    await guarded("welcome", async () => {
        const [sms, email] = await Promise.all([getSmsConfig(), getEmailNotificationConfig()]);
        if (user.phone && sms?.welcomeEnabled) {
            const message = renderTemplate(sms.welcomeTemplate, { siteName: sms.siteName, username: user.username });
            await fireSms("welcome", user.phone, message);
        }
        if (email.welcomeEnabled) {
            const vars = { siteName: email.siteName, username: user.username };
            await fireEmail("welcome", user.email, renderTemplate(email.welcomeSubject, vars), renderTemplate(email.welcomeTemplate, vars));
        }
    });
}
export async function notifyAddFundSuccess(user, params) {
    await guarded("add-fund-success", async () => {
        const [sms, email] = await Promise.all([getSmsConfig(), getEmailNotificationConfig()]);
        const vars = { amount: formatUsd(params.amount), balance: formatUsd(params.balance) };
        if (user.phone && sms?.addFundEnabled) {
            const message = renderTemplate(sms.addFundTemplate, { siteName: sms.siteName, username: user.username, ...vars });
            await fireSms("add-fund-success", user.phone, message);
        }
        if (email.addFundSuccessEnabled) {
            const emailVars = { siteName: email.siteName, username: user.username, ...vars };
            await fireEmail("add-fund-success", user.email, renderTemplate(email.addFundSuccessSubject, emailVars), renderTemplate(email.addFundSuccessTemplate, emailVars));
        }
    });
}
/** SMS has no "deposit rejected" message of its own (out of scope when the SMS feature shipped) — email only. */
export async function notifyAddFundFailed(user, params) {
    await guarded("add-fund-failed", async () => {
        const email = await getEmailNotificationConfig();
        if (!email.addFundFailedEnabled)
            return;
        const vars = { siteName: email.siteName, username: user.username, amount: formatUsd(params.amount) };
        await fireEmail("add-fund-failed", user.email, renderTemplate(email.addFundFailedSubject, vars), renderTemplate(email.addFundFailedTemplate, vars));
    });
}
export async function notifyOrderSuccess(user, params) {
    await guarded("order-success", async () => {
        const [sms, email] = await Promise.all([getSmsConfig(), getEmailNotificationConfig()]);
        const vars = { orderId: params.orderId, service: params.service, quantity: String(params.quantity) };
        if (user.phone && sms?.orderConfirmationEnabled) {
            const message = renderTemplate(sms.orderConfirmationTemplate, { siteName: sms.siteName, username: user.username, ...vars });
            await fireSms("order-success", user.phone, message);
        }
        if (email.orderSuccessEnabled) {
            const emailVars = { siteName: email.siteName, username: user.username, ...vars };
            await fireEmail("order-success", user.email, renderTemplate(email.orderSuccessSubject, emailVars), renderTemplate(email.orderSuccessTemplate, emailVars));
        }
    });
}
/** SMS has no "order failed" message of its own (out of scope when the SMS feature shipped) — email only. */
export async function notifyOrderFailed(user, params) {
    await guarded("order-failed", async () => {
        const email = await getEmailNotificationConfig();
        if (!email.orderFailedEnabled)
            return;
        const vars = {
            siteName: email.siteName,
            username: user.username,
            orderId: params.orderId,
            service: params.service,
            refundAmount: formatUsd(params.refundAmount),
        };
        await fireEmail("order-failed", user.email, renderTemplate(email.orderFailedSubject, vars), renderTemplate(email.orderFailedTemplate, vars));
    });
}
