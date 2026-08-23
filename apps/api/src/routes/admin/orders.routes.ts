import { Router } from "express";
import { paginationQuerySchema, updateOrderStatusSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { listOrdersForAdmin, updateOrderStatus } from "../../services/order.service.js";
import { writeAuditLog } from "../../services/audit.service.js";

export const adminOrdersRouter = Router();

adminOrdersRouter.get(
  "/",
  validate(paginationQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const result = await listOrdersForAdmin(page, pageSize, status, search);
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
