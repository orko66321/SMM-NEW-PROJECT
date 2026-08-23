import { Router } from "express";
import { createOrderSchema, paginationQuerySchema } from "@smm/shared";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { orderLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { createOrder, listOrdersForUser } from "../services/order.service.js";

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
    const order = await createOrder(req.user!.id, req.body, idempotencyKey);
    res.status(201).json({ order });
  }),
);

ordersRouter.get(
  "/",
  validate(paginationQuerySchema, "query"),
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
