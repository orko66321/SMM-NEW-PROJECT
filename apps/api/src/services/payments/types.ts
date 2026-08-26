/**
 * Contract every payment gateway adapter implements. The critical property
 * is `confirm()`: it must always make its own authenticated call back to the
 * gateway using our stored credentials to learn the true payment status —
 * never trust a redirect/webhook's query params or body as proof of
 * payment. This mirrors the "server always recalculates price" rule from
 * order placement (apps/api/src/services/order.service.ts) applied to money
 * coming *in* instead of going out.
 */

export interface InitiatePaymentParams {
  /** Always USD — every stored amount (Deposit.amount, Wallet.balance) is USD everywhere in this codebase (see SiteSettings.usdToBdtRate's schema comment). Converting to a gateway's own currency, if it needs one, is that adapter's own job — see zinipay.ts/bkash.ts's use of services/payments/currency.ts. */
  amount: number;
  payerReference: string;
  /** Customer display name/email — only ZiniPay's create call uses these (cus_name/cus_email); bKash ignores them. */
  payerName?: string;
  payerEmail?: string;
  callbackUrl: string;
  /**
   * Our own Deposit row id, created before `initiate()` is called (see
   * routes/payments.routes.ts) specifically so gateways whose async webhook
   * only carries *their* reference (ZiniPay) can have it embedded in the
   * browser redirect URL — the browser callback then looks the deposit up
   * directly instead of trying to parse a gateway-controlled query string.
   * bKash doesn't need this (its own paymentID comes back on the redirect).
   */
  depositId: string;
  /** Only used by gateways with an async server-to-server webhook distinct from the browser redirect (ZiniPay). */
  webhookUrl?: string;
}

export interface InitiatePaymentResult {
  redirectUrl: string;
  gatewayRef: string;
  /** Set when the adapter converted params.amount (USD) to its own currency before sending it to the gateway — the exact figure/currency actually charged, stored on Deposit for the admin audit trail and the soft mismatch check in deposit.service.ts's confirmGatewayDeposit. Undefined for a USD-native gateway. */
  gatewayAmount?: string;
  gatewayCurrency?: string;
}

export interface ConfirmPaymentResult {
  status: "PAID" | "FAILED" | "PENDING";
  /** Whatever amount the gateway itself reports as paid, in ITS currency (e.g. BDT) — not USD. Only used for the soft mismatch check against gatewayAmount above; the wallet is always credited from Deposit.amount (USD), never this. */
  amount?: number;
}

export interface PaymentGateway<TCredentials = unknown> {
  readonly key: string;
  initiate(credentials: TCredentials, params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
  confirm(credentials: TCredentials, gatewayRef: string): Promise<ConfirmPaymentResult>;
}
