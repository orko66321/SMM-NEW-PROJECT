import { Router } from "express";
import { paymentMethodInputSchema, paymentMethodObjectSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createPaymentMethod,
  deletePaymentMethod,
  listPaymentMethodsForAdmin,
  updatePaymentMethod,
} from "../../services/paymentMethod.service.js";
import { writeAuditLog } from "../../services/audit.service.js";

export const adminPaymentMethodsRouter = Router();

adminPaymentMethodsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ items: await listPaymentMethodsForAdmin() });
  }),
);

adminPaymentMethodsRouter.post(
  "/",
  validate(paymentMethodInputSchema),
  asyncHandler(async (req, res) => {
    const method = await createPaymentMethod(req.body);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "payment_method.create",
      targetType: "PaymentMethod",
      targetId: method.id,
      after: req.body,
      ip: req.ip,
    });
    res.status(201).json({ method });
  }),
);

adminPaymentMethodsRouter.put(
  "/:id",
  validate(paymentMethodObjectSchema.partial()),
  asyncHandler(async (req, res) => {
    const method = await updatePaymentMethod(req.params.id!, req.body);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "payment_method.update",
      targetType: "PaymentMethod",
      targetId: req.params.id!,
      after: req.body,
      ip: req.ip,
    });
    res.json({ method });
  }),
);

adminPaymentMethodsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deletePaymentMethod(req.params.id!);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "payment_method.delete",
      targetType: "PaymentMethod",
      targetId: req.params.id!,
      ip: req.ip,
    });
    res.status(204).end();
  }),
);
