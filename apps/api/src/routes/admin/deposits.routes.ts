import { Router } from "express";
import { paginationQuerySchema, reviewDepositSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { listDepositsForAdmin, reviewDeposit } from "../../services/deposit.service.js";
import { writeAuditLog } from "../../services/audit.service.js";

export const adminDepositsRouter = Router();

adminDepositsRouter.get(
  "/",
  validate(paginationQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const result = await listDepositsForAdmin(page, pageSize, status);
    res.json({ ...result, items: result.items.map((d) => ({ ...d, amount: d.amount.toString() })) });
  }),
);

adminDepositsRouter.post(
  "/:id/review",
  validate(reviewDepositSchema),
  asyncHandler(async (req, res) => {
    const { action, note } = req.body as { action: "APPROVE" | "REJECT"; note?: string };
    const deposit = await reviewDeposit(req.params.id!, req.user!.id, action, note);
    await writeAuditLog({
      actorId: req.user!.id,
      action: `deposit.${action.toLowerCase()}`,
      targetType: "Deposit",
      targetId: req.params.id!,
      after: { action, note },
      ip: req.ip,
    });
    res.json({ deposit: { ...deposit, amount: deposit.amount.toString() } });
  }),
);
