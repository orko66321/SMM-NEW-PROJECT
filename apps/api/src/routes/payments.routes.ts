import { Router } from "express";
import { PaymentGatewayKeys, createGatewayDepositSchema, type PaymentGatewayKey } from "@smm/shared";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { env } from "../env.js";
import { logger } from "../lib/logger.js";
import { gatewayRegistry } from "../services/payments/registry.js";
import { getEnabledGatewayCredentials, listEnabledGatewayKeys } from "../services/payments/config.service.js";
import { confirmGatewayDeposit, createGatewayDeposit } from "../services/deposit.service.js";

export const paymentsRouter = Router();

function requireKnownGateway(rawKey: string): PaymentGatewayKey {
  const key = rawKey.toUpperCase();
  if (!(PaymentGatewayKeys as readonly string[]).includes(key)) {
    throw AppError.notFound("Unknown payment gateway");
  }
  return key as PaymentGatewayKey;
}

paymentsRouter.get(
  "/gateways",
  asyncHandler(async (_req, res) => {
    res.json({ enabled: await listEnabledGatewayKeys() });
  }),
);

paymentsRouter.post(
  "/:gateway/deposits",
  authenticate,
  validate(createGatewayDepositSchema),
  asyncHandler(async (req, res) => {
    const key = requireKnownGateway(req.params.gateway!);
    const adapter = gatewayRegistry[key];
    const credentials = await getEnabledGatewayCredentials(key);

    const { amount } = req.body as { amount: number };
    const callbackUrl = `${env.APP_BASE_URL}/api/payments/${key}/callback`;

    const { redirectUrl, gatewayRef } = await adapter.initiate(credentials, {
      amount,
      payerReference: req.user!.id,
      callbackUrl,
    });

    await createGatewayDeposit({ userId: req.user!.id, amount, gatewayProvider: key, gatewayRef });

    res.status(201).json({ redirectUrl });
  }),
);

// Public — the gateway redirects the customer's browser here with no auth
// header. The only thing trusted from this request is *that a check should
// happen*; the actual payment status always comes from our own
// server-to-server call inside adapter.confirm() (see services/payments/bkash.ts).
paymentsRouter.get(
  "/:gateway/callback",
  asyncHandler(async (req, res) => {
    const key = requireKnownGateway(req.params.gateway!);
    const adapter = gatewayRegistry[key];

    // bKash's redirect carries the payment id as `paymentID`. Other
    // gateways may use a different query param — extend this switch (not a
    // generic `req.query.gatewayRef`) if/when a second adapter is added, so
    // each gateway's actual redirect contract stays explicit.
    const gatewayRef = typeof req.query.paymentID === "string" ? req.query.paymentID : undefined;
    if (!gatewayRef) {
      return res.redirect(`${env.FRONTEND_BASE_URL}/dashboard/wallet?deposit=error`);
    }

    try {
      const credentials = await getEnabledGatewayCredentials(key);
      const result = await adapter.confirm(credentials, gatewayRef);
      await confirmGatewayDeposit(gatewayRef, { status: result.status, gatewayProvider: key });
      const outcome = result.status === "PAID" ? "success" : result.status === "FAILED" ? "failed" : "pending";
      return res.redirect(`${env.FRONTEND_BASE_URL}/dashboard/wallet?deposit=${outcome}`);
    } catch (err) {
      logger.error({ err, gateway: key, gatewayRef }, "Payment callback confirm failed");
      return res.redirect(`${env.FRONTEND_BASE_URL}/dashboard/wallet?deposit=error`);
    }
  }),
);
