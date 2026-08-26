import { Router } from "express";
import { createOrderSchema, orderListQuerySchema } from "@smm/shared";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { orderLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { createOrderOrRedirect, listOrdersForUser, listRefillsForOrder, requestRefill } from "../services/order.service.js";

export const ordersRouter = Router();
ordersRouter.use(authenticate);

ordersRouter.post(
  "/",
  orderLimiter,
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const idempotencyKey = req.header("Idempotency-Key");
    if (!idempotencyKey) {
      throw AppError.badRequest("Idempotency-Key header is required to place an order");
    }
    const result = await createOrderOrRedirect(req.user!.id, req.body, idempotencyKey);
    res.status(201).json({ order: result.order });
  }),
);

ordersRouter.get(
  "/",
  validate(orderListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const result = await listOrdersForUser(req.user!.id, page, pageSize, status);
    res.json({
      ...result,
      items: result.items.map((o) => ({ ...o, charge: o.charge.toString(), providerCost: o.providerCost.toString() })),
    });
  }),
);

ordersRouter.post(
  "/:id/refill",
  orderLimiter,
  asyncHandler(async (req, res) => {
    const refill = await requestRefill(req.user!.id, req.params.id!);
    res.status(201).json({ refill });
  }),
);

ordersRouter.get(
  "/:id/refills",
  asyncHandler(async (req, res) => {
    const refills = await listRefillsForOrder(req.user!.id, req.params.id!);
    res.json({ items: refills });
  }),
);
