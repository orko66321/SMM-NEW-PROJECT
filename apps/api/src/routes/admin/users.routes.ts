import { Router } from "express";
import { paginationQuerySchema, updateUserSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getUserDetail, listUsers, updateUser } from "../../services/user.service.js";
import { writeAuditLog } from "../../services/audit.service.js";

export const adminUsersRouter = Router();

adminUsersRouter.get(
  "/",
  validate(paginationQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    res.json(await listUsers(page, pageSize, search));
  }),
);

adminUsersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await getUserDetail(req.params.id!);
    res.json({
      user: {
        ...user,
        wallet: user.wallet ? { balance: user.wallet.balance.toString() } : null,
      },
    });
  }),
);

adminUsersRouter.patch(
  "/:id",
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const { before, after } = await updateUser(req.params.id!, req.body);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "user.update",
      targetType: "User",
      targetId: req.params.id!,
      before: { role: before.role, status: before.status },
      after: { role: after.role, status: after.status },
      ip: req.ip,
    });
    res.json({ user: after });
  }),
);
