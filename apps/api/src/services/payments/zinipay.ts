import axios from "axios";
import type { ZiniPayCredentials } from "@smm/shared";
import type { ConfirmPaymentResult, InitiatePaymentParams, InitiatePaymentResult, PaymentGateway } from "./types.js";
import { usdToGatewayBdt } from "./currency.js";

/**
 * ZiniPay adapter — a Bangladeshi payment aggregator fronting bKash/Nagad/
 * Rocket/cards behind one hosted-checkout API.
 *
 * Field shapes below are confirmed against a real reference integration
 * (a working PHP module's create/verify calls), not just ZiniPay's public
 * docs — two things the docs alone left ambiguous turned out to matter:
 *   - POST /v1/payment/verify takes `{ invoiceId }` — **camelCase**, not
 *     `invoice_id`. Sending `invoice_id` there is a silent-looking bug: axios
 *     gets a 200 back either way if ZiniPay just ignores unknown fields, but
 *     confirm() would then be looking up a payment ZiniPay never received a
 *     real identifier for. (Contrast: the async webhook *ZiniPay sends us*
 *     does use snake_case `invoice_id` in its JSON body — see
 *     routes/payments.routes.ts's resolveWebhookGatewayRef. Request and
 *     webhook payload shapes are simply inconsistent with each other in
 *     ZiniPay's own API, confirmed by the reference implementation checking
 *     both `invoiceId` and `invoice_id` in different places.)
 *   - POST /v1/payment/create requires customer identity fields
 *     (`cus_name`, `cus_email`) that this adapter previously omitted
 *     entirely, plus `val_id`/`metadata`/`return_type` which the reference
 *     implementation always sends (val_id set to the merchant's own
 *     transaction reference — our depositId here — echoed back on verify).
 *   - Auth: `zini-api-key` header + `Content-Type: application/json`.
 *   - POST /v1/payment/create → { status, message, payment_url }; no
 *     separate invoice-id field, so it's parsed from payment_url's last
 *     path segment (`https://secure.zinipay.com/payment/INVOICE_ID`).
 *   - confirm() is the only source of truth this adapter trusts — never the
 *     webhook or browser redirect, matching every other gateway here.
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

    // ZiniPay is BDT-only — params.amount is USD (see InitiatePaymentParams'
    // doc comment). Real bug this fixes: this used to send params.amount
    // straight through unconverted, so a $0.20 charge went out as "0.20"
    // (0.20 BDT) instead of "26.00" (0.20 * 130).
    const bdtAmount = await usdToGatewayBdt(params.amount);

    const res = await axios.post<CreateInvoiceResponse>(
      `${creds.baseUrl}/v1/payment/create`,
      {
        cus_name: params.payerName ?? "Customer",
        cus_email: params.payerEmail ?? "no-reply@allinonsr.com",
        amount: Number(bdtAmount),
        // val_id is echoed back verbatim on verify — our own depositId, so
        // confirm()'s caller can cross-check it if ever needed. Not itself
        // used for the confirm() lookup (that's gatewayRef/invoiceId,
        // parsed from payment_url below), just extra correlation.
        val_id: params.depositId,
        metadata: { order_id: params.depositId, user_id: params.payerReference },
        redirect_url: redirectUrl,
        return_type: "GET",
        cancel_url: redirectUrl,
        webhook_url: params.webhookUrl,
      },
      { headers: authHeaders(creds), timeout: 15_000 },
    );

    if (!res.data.status) {
      throw new Error(`ZiniPay create invoice failed: ${res.data.message}`);
    }

    return {
      redirectUrl: res.data.payment_url,
      gatewayRef: parseInvoiceId(res.data.payment_url),
      gatewayAmount: bdtAmount,
      gatewayCurrency: "BDT",
    };
  },

  async confirm(creds, gatewayRef): Promise<ConfirmPaymentResult> {
    const res = await axios.post<VerifyInvoiceResponse>(
      `${creds.baseUrl}/v1/payment/verify`,
      { invoiceId: gatewayRef },
      { headers: authHeaders(creds), timeout: 15_000 },
    );

    if (res.data.status === "COMPLETED") return { status: "PAID", amount: res.data.amount };
    if (res.data.status === "FAILED") return { status: "FAILED" };
    return { status: "PENDING" };
  },
};
