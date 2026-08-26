import crypto from "node:crypto";
import axios from "axios";
import type { BkashCredentials } from "@smm/shared";
import type { ConfirmPaymentResult, InitiatePaymentParams, InitiatePaymentResult, PaymentGateway } from "./types.js";
import { logger } from "../../lib/logger.js";
import { usdToGatewayBdt } from "./currency.js";

/**
 * bKash Tokenized Checkout (merchant) API adapter.
 *
 * Flow: grant token → create payment → redirect the customer to bKash's
 * `bkashURL` → bKash redirects back to our callback with a `paymentID` →
 * we independently execute/query that paymentID against bKash's API to get
 * the authoritative status (see `confirm`, called from
 * routes/payments.routes.ts and the reconciliation cron).
 *
 * NOTE: implemented against bKash's public Tokenized Checkout API docs.
 * This has not been run against a live bKash sandbox (no merchant account
 * exists yet — see Phase 2 plan) — treat as reviewed-but-unverified until
 * exercised with real sandbox credentials via the admin Payment Gateways
 * page, in SANDBOX mode, before ever enabling LIVE mode.
 */

interface GrantTokenResponse {
  id_token: string;
  token_type: string;
}

interface CreatePaymentResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  bkashURL: string;
}

interface ExecuteOrQueryResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  transactionStatus?: string;
  amount?: string;
}

function bkashHeaders(idToken: string, appKey: string) {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: idToken,
    "X-App-Key": appKey,
  };
}

async function grantToken(creds: BkashCredentials): Promise<string> {
  const res = await axios.post<GrantTokenResponse>(
    `${creds.baseUrl}/tokenized/checkout/token/grant`,
    { app_key: creds.appKey, app_secret: creds.appSecret },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        username: creds.username,
        password: creds.password,
      },
      timeout: 15_000,
    },
  );
  return res.data.id_token;
}

async function createPayment(
  creds: BkashCredentials,
  idToken: string,
  params: InitiatePaymentParams,
  bdtAmount: string,
): Promise<CreatePaymentResponse> {
  const res = await axios.post<CreatePaymentResponse>(
    `${creds.baseUrl}/tokenized/checkout/create`,
    {
      mode: "0011",
      payerReference: params.payerReference,
      callbackURL: params.callbackUrl,
      amount: bdtAmount,
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: crypto.randomUUID(),
    },
    { headers: bkashHeaders(idToken, creds.appKey), timeout: 15_000 },
  );
  if (res.data.statusCode !== "0000") {
    throw new Error(`bKash create payment failed: ${res.data.statusMessage}`);
  }
  return res.data;
}

async function executePayment(creds: BkashCredentials, idToken: string, paymentID: string) {
  const res = await axios.post<ExecuteOrQueryResponse>(
    `${creds.baseUrl}/tokenized/checkout/execute`,
    { paymentID },
    { headers: bkashHeaders(idToken, creds.appKey), timeout: 15_000 },
  );
  return res.data;
}

async function queryPayment(creds: BkashCredentials, idToken: string, paymentID: string) {
  const res = await axios.post<ExecuteOrQueryResponse>(
    `${creds.baseUrl}/tokenized/checkout/payment/status`,
    { paymentID },
    { headers: bkashHeaders(idToken, creds.appKey), timeout: 15_000 },
  );
  return res.data;
}

function toConfirmResult(res: ExecuteOrQueryResponse): ConfirmPaymentResult {
  if (res.transactionStatus === "Completed") {
    return { status: "PAID", amount: res.amount ? Number(res.amount) : undefined };
  }
  if (res.transactionStatus === "Cancelled" || res.transactionStatus === "Failed") {
    return { status: "FAILED" };
  }
  return { status: "PENDING" };
}

export const bkashGateway: PaymentGateway<BkashCredentials> = {
  key: "BKASH",

  async initiate(creds, params): Promise<InitiatePaymentResult> {
    // bKash is BDT-only — params.amount is USD (see InitiatePaymentParams'
    // doc comment). Real bug this fixes: `currency: "BDT"` was hardcoded
    // here while `amount` was the raw USD figure, just .toFixed(2)'d — a
    // $0.20 charge was declared as "0.20 BDT" instead of "26.00 BDT".
    const bdtAmount = await usdToGatewayBdt(params.amount);
    const idToken = await grantToken(creds);
    const payment = await createPayment(creds, idToken, params, bdtAmount);
    return { redirectUrl: payment.bkashURL, gatewayRef: payment.paymentID, gatewayAmount: bdtAmount, gatewayCurrency: "BDT" };
  },

  async confirm(creds, gatewayRef): Promise<ConfirmPaymentResult> {
    const idToken = await grantToken(creds);
    try {
      const executed = await executePayment(creds, idToken, gatewayRef);
      return toConfirmResult(executed);
    } catch (err) {
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
