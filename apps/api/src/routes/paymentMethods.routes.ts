import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { listActivePaymentMethods } from "../services/paymentMethod.service.js";

export const paymentMethodsRouter = Router();
paymentMethodsRouter.use(authenticate);

paymentMethodsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ items: await listActivePaymentMethods() });
  }),
);
