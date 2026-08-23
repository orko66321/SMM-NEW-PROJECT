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
  callbackUrl: string;
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
