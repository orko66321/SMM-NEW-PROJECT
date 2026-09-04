import { Router } from "express";
import { adminOrderListQuerySchema, adminRefillListQuerySchema, resolveManualRefillSchema, updateOrderStatusSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  listOrdersForAdmin,
  listRefillsForAdmin,
  resendOrderToProvider,
  resolveManualRefill,
  updateOrderStatus,
} from "../../services/order.service.js";
import { writeAuditLog } from "../../services/audit.service.js";

export const adminOrdersRouter = Router();

adminOrdersRouter.get(
  "/",
  validate(adminOrderListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const from = req.query.from instanceof Date ? req.query.from : undefined;
    const to = req.query.to instanceof Date ? req.query.to : undefined;
    const likeOnly = req.query.likeOnly === "true";
    const result = await listOrdersForAdmin(page, pageSize, status, search, { from, to }, likeOnly);
    res.json({
      ...result,
      items: result.items.map((o) => ({ ...o, charge: o.charge.toString(), providerCost: o.providerCost.toString() })),
    });
  }),
);

adminOrdersRouter.patch(
  "/:id/status",
  validate(updateOrderStatusSchema),
  asyncHandler(async (req, res) => {
    const order = await updateOrderStatus(req.params.id!, req.body);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "order.status_update",
      targetType: "Order",
      targetId: req.params.id!,
      after: req.body,
      ip: req.ip,
    });
    res.json({ order: { ...order, charge: order.charge.toString(), providerCost: order.providerCost.toString() } });
  }),
);

// Admin "Resend / Retry API" — resubmits a stuck PENDING/FAILED order to its
// provider (see resendOrderToProvider). Throws 502 with the raw provider
// error on failure (already persisted to the order's apiErrorResponse).
adminOrdersRouter.post(
  "/:id/resend",
  asyncHandler(async (req, res) => {
    const order = await resendOrderToProvider(req.params.id!);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "order.resend",
      targetType: "Order",
      targetId: req.params.id!,
      after: { status: order.status, providerOrderId: order.providerOrderId },
      ip: req.ip,
    });
    res.json({ order: { ...order, charge: order.charge.toString(), providerCost: order.providerCost.toString() } });
  }),
);

adminOrdersRouter.get(
  "/refills",
  validate(adminRefillListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const result = await listRefillsForAdmin(page, pageSize, status);
    res.json(result);
  }),
);

// Resolves a manual-mode refill (no provider to poll — see requestRefill in
// order.service.ts). A provider-submitted refill instead resolves itself via
// cron/pollRefillStatus.ts and is never touched through this endpoint.
adminOrdersRouter.patch(
  "/refills/:id",
  validate(resolveManualRefillSchema),
  asyncHandler(async (req, res) => {
    const refill = await resolveManualRefill(req.params.id!, req.body);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "refill.resolve",
      targetType: "RefillRequest",
      targetId: req.params.id!,
      after: req.body,
      ip: req.ip,
    });
    res.json({ refill });
  }),
);
