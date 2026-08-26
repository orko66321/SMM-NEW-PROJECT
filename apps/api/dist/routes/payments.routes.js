import { Router } from "express";
import { PaymentGatewayKeys, createGatewayDepositSchema } from "@smm/shared";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { env } from "../env.js";
import { logger } from "../lib/logger.js";
import { gatewayRegistry } from "../services/payments/registry.js";
import { getEnabledGatewayCredentials, getGatewayAutoVerify, listEnabledGatewayKeys } from "../services/payments/config.service.js";
import { confirmGatewayDeposit, createPendingGatewayDeposit, getDepositById, setDepositGatewayRef, } from "../services/deposit.service.js";
export const paymentsRouter = Router();
function requireKnownGateway(rawKey) {
    const key = rawKey.toUpperCase();
    if (!PaymentGatewayKeys.includes(key)) {
        throw AppError.notFound("Unknown payment gateway");
    }
    return key;
}
/**
 * Each gateway's browser redirect carries a different reference in its
 * query string — bKash echoes back its own `paymentID`; ZiniPay's redirect
 * is one we built ourselves (see routes/payments.routes.ts `/deposits`
 * below), so it carries our own `depositId` instead, and we look up the
 * gatewayRef we stored for it. Extend this per gateway rather than reaching
 * for one generic query param name, so each contract stays explicit.
 */
async function resolveCallbackGatewayRef(key, req) {
    if (key === "BKASH") {
        return typeof req.query.paymentID === "string" ? req.query.paymentID : undefined;
    }
    if (key === "ZINIPAY") {
        const depositId = typeof req.query.depositId === "string" ? req.query.depositId : undefined;
        if (!depositId)
            return undefined;
        const deposit = await getDepositById(depositId);
        return deposit?.gatewayRef ?? undefined;
    }
    return undefined;
}
/** Webhook payloads are gateway-specific too — ZiniPay sends `invoice_id` as JSON or query string. */
function resolveWebhookGatewayRef(key, req) {
    const body = req.body;
    if (key === "ZINIPAY") {
        const fromBody = typeof body?.invoice_id === "string" ? body.invoice_id : undefined;
        const fromQuery = typeof req.query.invoice_id === "string" ? req.query.invoice_id : undefined;
        return fromBody ?? fromQuery;
    }
    return undefined;
}
paymentsRouter.get("/gateways", asyncHandler(async (_req, res) => {
    res.json({ enabled: await listEnabledGatewayKeys() });
}));
paymentsRouter.post("/:gateway/deposits", authenticate, validate(createGatewayDepositSchema), asyncHandler(async (req, res) => {
    const key = requireKnownGateway(req.params.gateway);
    const adapter = gatewayRegistry[key];
    const credentials = await getEnabledGatewayCredentials(key);
    const { amount, paymentMethodId, couponCode } = req.body;
    // Created before calling the gateway so we have our own reference to
    // embed in the redirect URL — see InitiatePaymentParams.depositId.
    const deposit = await createPendingGatewayDeposit({ userId: req.user.id, amount, gatewayProvider: key, paymentMethodId, couponCode });
    const callbackUrl = `${env.APP_BASE_URL}/api/payments/${key.toLowerCase()}/callback`;
    const webhookUrl = `${env.APP_BASE_URL}/api/payments/${key.toLowerCase()}/webhook`;
    // Only ZiniPay's create call actually needs these (cus_name/cus_email —
    // see services/payments/zinipay.ts), but fetching unconditionally here
    // keeps the gateway-specific requirement out of this route handler.
    const payer = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id }, select: { username: true, email: true } });
    // Unlike /callback and /confirm below, a failure here has no fallback
    // to degrade to — but it must still never reach the generic 500
    // handler with a raw upstream error message. A bad/expired sandbox
    // credential, gateway downtime, or a malformed response (e.g. ZiniPay's
    // payment_url not containing a parseable invoice id) throws a plain
    // Error/AxiosError, not an AppError, from inside the adapter — log the
    // real cause here (so it's actually diagnosable), then surface a safe,
    // generic message to the client.
    let initiateResult;
    try {
        initiateResult = await adapter.initiate(credentials, {
            amount,
            payerReference: req.user.id,
            payerName: payer.username,
            payerEmail: payer.email,
            callbackUrl,
            webhookUrl,
            depositId: deposit.id,
        });
    }
    catch (err) {
        logger.error({ err, gateway: key, depositId: deposit.id }, "Payment gateway initiate() failed");
        throw new AppError(502, "The payment gateway is temporarily unavailable. Please try again shortly.");
    }
    const { redirectUrl, gatewayRef } = initiateResult;
    await setDepositGatewayRef(deposit.id, gatewayRef);
    res.status(201).json({ redirectUrl });
}));
// Public — the gateway redirects the customer's browser here with no auth
// header. The only thing trusted from this request is *that a check should
// happen*; the actual payment status always comes from our own
// server-to-server call inside adapter.confirm() (see services/payments/*.ts).
paymentsRouter.get("/:gateway/callback", asyncHandler(async (req, res) => {
    const key = requireKnownGateway(req.params.gateway);
    const adapter = gatewayRegistry[key];
    const gatewayRef = await resolveCallbackGatewayRef(key, req);
    if (!gatewayRef) {
        return res.redirect(`${env.FRONTEND_BASE_URL}/dashboard/wallet?deposit=error`);
    }
    try {
        const credentials = await getEnabledGatewayCredentials(key);
        const autoVerify = await getGatewayAutoVerify(key);
        const result = await adapter.confirm(credentials, gatewayRef);
        await confirmGatewayDeposit(gatewayRef, { status: result.status, gatewayProvider: key }, { autoVerify });
        const outcome = result.status === "PAID" ? "success" : result.status === "FAILED" ? "failed" : "pending";
        return res.redirect(`${env.FRONTEND_BASE_URL}/dashboard/wallet?deposit=${outcome}`);
    }
    catch (err) {
        logger.error({ err, gateway: key, gatewayRef }, "Payment callback confirm failed");
        return res.redirect(`${env.FRONTEND_BASE_URL}/dashboard/wallet?deposit=error`);
    }
}));
// Public, server-to-server — async notification distinct from the browser
// redirect above. Deliberately never trusts the webhook's own claimed
// status: it re-derives the gatewayRef and always calls adapter.confirm()
// itself before crediting anything, which is what actually satisfies
// "prevent query-string manipulation," not the fact that this endpoint has
// no browser/cookie context to manipulate in the first place.
paymentsRouter.post("/:gateway/webhook", asyncHandler(async (req, res) => {
    const key = requireKnownGateway(req.params.gateway);
    const adapter = gatewayRegistry[key];
    const gatewayRef = resolveWebhookGatewayRef(key, req);
    if (!gatewayRef) {
        return res.status(400).json({ error: "Missing payment reference" });
    }
    try {
        const credentials = await getEnabledGatewayCredentials(key);
        const autoVerify = await getGatewayAutoVerify(key);
        const result = await adapter.confirm(credentials, gatewayRef);
        await confirmGatewayDeposit(gatewayRef, { status: result.status, gatewayProvider: key }, { autoVerify });
        res.status(200).json({ received: true });
    }
    catch (err) {
        logger.error({ err, gateway: key, gatewayRef }, "Payment webhook confirm failed");
        // Ack anyway so the gateway doesn't retry-storm us — the reconciliation
        // cron (cron/reconcilePendingDeposits.ts) covers eventual consistency
        // if this particular attempt failed transiently.
        res.status(200).json({ received: true });
    }
}));
