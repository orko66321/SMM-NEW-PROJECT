import type { PaymentGatewayKey } from "@smm/shared";
import type { PaymentGateway } from "./types.js";
import { bkashGateway } from "./bkash.js";

// Add new gateway adapters here and to PaymentGatewayKeys in
// packages/shared/src/index.ts — everything else (routes, cron
// reconciliation, admin config CRUD) is written generically against the
// PaymentGateway interface and needs no changes for a new gateway.
//
// `PaymentGateway<any>` here is deliberate: each concrete adapter is typed
// against its own credentials shape (e.g. bkashGateway: PaymentGateway<BkashCredentials>),
// but callers look this map up dynamically by a runtime key, so there is no
// single credentials type the registry itself can express — callers get
// back whatever `getEnabledGatewayCredentials<T>()` decrypts and pass it
// straight through.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const gatewayRegistry: Record<PaymentGatewayKey, PaymentGateway<any>> = {
  BKASH: bkashGateway,
};
