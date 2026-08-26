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
}

export interface ConfirmPaymentResult {
  status: "PAID" | "FAILED" | "PENDING";
  amount?: number;
}

export interface PaymentGateway<TCredentials = unknown> {
  readonly key: string;
  initiate(credentials: TCredentials, params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
  confirm(credentials: TCredentials, gatewayRef: string): Promise<ConfirmPaymentResult>;
}
