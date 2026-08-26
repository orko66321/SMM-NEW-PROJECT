import crypto from "node:crypto";
import axios from "axios";
import { logger } from "../../lib/logger.js";
import { usdToGatewayBdt } from "./currency.js";
function bkashHeaders(idToken, appKey) {
    return {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: idToken,
        "X-App-Key": appKey,
    };
}
async function grantToken(creds) {
    const res = await axios.post(`${creds.baseUrl}/tokenized/checkout/token/grant`, { app_key: creds.appKey, app_secret: creds.appSecret }, {
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            username: creds.username,
            password: creds.password,
        },
        timeout: 15_000,
    });
    return res.data.id_token;
}
async function createPayment(creds, idToken, params, bdtAmount) {
    const res = await axios.post(`${creds.baseUrl}/tokenized/checkout/create`, {
        mode: "0011",
        payerReference: params.payerReference,
        callbackURL: params.callbackUrl,
        amount: bdtAmount,
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: crypto.randomUUID(),
    }, { headers: bkashHeaders(idToken, creds.appKey), timeout: 15_000 });
    if (res.data.statusCode !== "0000") {
        throw new Error(`bKash create payment failed: ${res.data.statusMessage}`);
    }
    return res.data;
}
async function executePayment(creds, idToken, paymentID) {
    const res = await axios.post(`${creds.baseUrl}/tokenized/checkout/execute`, { paymentID }, { headers: bkashHeaders(idToken, creds.appKey), timeout: 15_000 });
    return res.data;
}
async function queryPayment(creds, idToken, paymentID) {
    const res = await axios.post(`${creds.baseUrl}/tokenized/checkout/payment/status`, { paymentID }, { headers: bkashHeaders(idToken, creds.appKey), timeout: 15_000 });
    return res.data;
}
function toConfirmResult(res) {
    if (res.transactionStatus === "Completed") {
        return { status: "PAID", amount: res.amount ? Number(res.amount) : undefined };
    }
    if (res.transactionStatus === "Cancelled" || res.transactionStatus === "Failed") {
        return { status: "FAILED" };
    }
    return { status: "PENDING" };
}
export const bkashGateway = {
    key: "BKASH",
    async initiate(creds, params) {
        // bKash is BDT-only — params.amount is USD (see InitiatePaymentParams'
        // doc comment). Real bug this fixes: `currency: "BDT"` was hardcoded
        // here while `amount` was the raw USD figure, just .toFixed(2)'d — a
        // $0.20 charge was declared as "0.20 BDT" instead of "26.00 BDT".
        const bdtAmount = await usdToGatewayBdt(params.amount);
        const idToken = await grantToken(creds);
        const payment = await createPayment(creds, idToken, params, bdtAmount);
        return { redirectUrl: payment.bkashURL, gatewayRef: payment.paymentID, gatewayAmount: bdtAmount, gatewayCurrency: "BDT" };
    },
    async confirm(creds, gatewayRef) {
        const idToken = await grantToken(creds);
        try {
            const executed = await executePayment(creds, idToken, gatewayRef);
            return toConfirmResult(executed);
        }
        catch (err) {
            // "Already completed/executed" is bKash's error path for a payment we
            // (or a previous callback delivery) already executed — fall back to
            // Query Payment for the authoritative status instead of assuming
            // either success or failure from the execute error alone.
            logger.warn({ err, gatewayRef }, "bKash execute failed, falling back to query payment status");
            const queried = await queryPayment(creds, idToken, gatewayRef);
            return toConfirmResult(queried);
        }
    },
};
