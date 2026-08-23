import axios from "axios";
import type { ZiniPayCredentials } from "@smm/shared";
import type { ConfirmPaymentResult, InitiatePaymentParams, InitiatePaymentResult, PaymentGateway } from "./types.js";

/**
 * ZiniPay adapter — a Bangladeshi payment aggregator fronting bKash/Nagad/
 * Rocket/cards behind one hosted-checkout API.
 *
 * Implemented against ZiniPay's public docs (https://zinipay.com/docs):
 *   - Auth: `zini-api-key` header + `Content-Type: application/json`.
 *   - POST /v1/payment/create → { status, message, payment_url }. The docs
 *     do not show a separate `invoice_id` field in this response, only the
 *     payment_url (`https://secure.zinipay.com/payment/INVOICE_ID`) — the
 *     invoice id is parsed from its last path segment. Flag this as the one
 *     assumption in this adapter that needs confirming against a real
 *     sandbox response before going live, same treatment Phase 2 gave bKash.
 *   - POST /v1/payment/verify with { invoice_id } → { status: "PENDING" |
 *     "COMPLETED" | "FAILED", ... } — this is what confirm() calls; it is
 *     the only source of truth this adapter trusts.
 *   - Webhook payload carries only ZiniPay's invoice_id, no signature is
 *     documented — ZiniPay's own docs say to always verify from the
 *     backend, which is exactly what confirm() does regardless of what a
 *     webhook or redirect claims.
 */

interface CreateInvoiceResponse {
  status: boolean;
  message: string;
  payment_url: string;
}

interface VerifyInvoiceResponse {
  invoice_id: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  amount?: number;
}

function authHeaders(creds: ZiniPayCredentials) {
  return {
    "Content-Type": "application/json",
    "zini-api-key": creds.apiKey,
  };
}

function parseInvoiceId(paymentUrl: string): string {
  const segments = paymentUrl.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) throw new Error(`Could not parse invoice id from ZiniPay payment_url: ${paymentUrl}`);
  return last;
}

export const zinipayGateway: PaymentGateway<ZiniPayCredentials> = {
  key: "ZINIPAY",

  async initiate(creds, params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const redirectUrl = `${params.callbackUrl}?depositId=${encodeURIComponent(params.depositId)}`;

    const res = await axios.post<CreateInvoiceResponse>(
      `${creds.baseUrl}/v1/payment/create`,
      {
        amount: params.amount,
        redirect_url: redirectUrl,
        cancel_url: redirectUrl,
        webhook_url: params.webhookUrl,
      },
      { headers: authHeaders(creds), timeout: 15_000 },
    );

    if (!res.data.status) {
      throw new Error(`ZiniPay create invoice failed: ${res.data.message}`);
    }

    return { redirectUrl: res.data.payment_url, gatewayRef: parseInvoiceId(res.data.payment_url) };
  },

  async confirm(creds, gatewayRef): Promise<ConfirmPaymentResult> {
    const res = await axios.post<VerifyInvoiceResponse>(
      `${creds.baseUrl}/v1/payment/verify`,
      { invoice_id: gatewayRef },
      { headers: authHeaders(creds), timeout: 15_000 },
    );

    if (res.data.status === "COMPLETED") return { status: "PAID", amount: res.data.amount };
    if (res.data.status === "FAILED") return { status: "FAILED" };
    return { status: "PENDING" };
  },
};
