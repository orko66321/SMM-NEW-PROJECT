import { getSmsConfig } from "./settings.service.js";
import { sendSms } from "../lib/sms.js";
import { logger } from "../lib/logger.js";
/**
 * Event-triggered SMS (welcome / add-fund / order-confirmation) — the
 * business-flow side of the SMS feature; lib/sms.ts is just the raw
 * uronto SMS HTTP call. Every function here is deliberately best-effort:
 * it never throws, so a slow/misconfigured/down SMS gateway can never fail
 * or roll back the registration, deposit-credit or order-placement that
 * triggered it. Call these AFTER the triggering DB transaction has
 * committed, never from inside one — an SMS provider call has no place
 * holding a Postgres transaction open.
 */
function renderTemplate(template, vars) {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => vars[key] ?? "");
}
function formatUsd(amount) {
    return `$${amount.toFixed(2)}`;
}
async function fireAndLog(kind, to, message) {
    try {
        await sendSms(to, message);
    }
    catch (err) {
        logger.error({ err, kind, to }, "Notification SMS failed");
    }
}
export async function sendWelcomeSms(user) {
    if (!user.phone)
        return;
    const config = await getSmsConfig();
    if (!config || !config.welcomeEnabled)
        return;
    const message = renderTemplate(config.welcomeTemplate, { siteName: config.siteName, username: user.username });
    await fireAndLog("welcome", user.phone, message);
}
export async function sendAddFundSms(user, params) {
    if (!user.phone)
        return;
    const config = await getSmsConfig();
    if (!config || !config.addFundEnabled)
        return;
    const message = renderTemplate(config.addFundTemplate, {
        siteName: config.siteName,
        username: user.username,
        amount: formatUsd(params.amount),
        balance: formatUsd(params.balance),
    });
    await fireAndLog("add-fund", user.phone, message);
}
export async function sendOrderConfirmationSms(user, params) {
    if (!user.phone)
        return;
    const config = await getSmsConfig();
    if (!config || !config.orderConfirmationEnabled)
        return;
    const message = renderTemplate(config.orderConfirmationTemplate, {
        siteName: config.siteName,
        username: user.username,
        orderId: params.orderId,
        service: params.service,
        quantity: String(params.quantity),
    });
    await fireAndLog("order-confirmation", user.phone, message);
}
