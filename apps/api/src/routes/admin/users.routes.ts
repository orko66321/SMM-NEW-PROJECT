import { Router } from "express";
import { updateUserSchema, userListQuerySchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getUserDetail, listUsers, updateUser } from "../../services/user.service.js";
import { writeAuditLog } from "../../services/audit.service.js";

export const adminUsersRouter = Router();

adminUsersRouter.get(
  "/",
  validate(userListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const from = req.query.from instanceof Date ? req.query.from : undefined;
    const to = req.query.to instanceof Date ? req.query.to : undefined;
    res.json(await listUsers(page, pageSize, search, { from, to }));
  }),
);

adminUsersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await getUserDetail(req.params.id!);
    // Explicit allow-list — the raw row carries passwordHash / twoFactorSecret /
    // apiKeyHash which must never reach the admin client.
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        isVip: user.isVip,
        isReseller: user.isReseller,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        twoFactorEnabled: user.twoFactorEnabled,
        hasApiKey: !!user.apiKeyHash,
        createdAt: user.createdAt,
        _count: user._count,
        wallet: user.wallet ? { balance: user.wallet.balance.toString() } : null,
      },
    });
  }),
);

// Role / status / access-flag changes are ADMIN only — a MODERATOR can read
// the user list but never re-tier accounts (see routes/admin/index.ts).
adminUsersRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const { before, after } = await updateUser(req.params.id!, req.user!.id, req.body);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "user.update",
      targetType: "User",
      targetId: req.params.id!,
      before: { role: before.role, status: before.status, isVip: before.isVip, isReseller: before.isReseller },
      after: { role: after.role, status: after.status, isVip: after.isVip, isReseller: after.isReseller },
      ip: req.ip,
    });
    // Never echo the raw row back — it carries passwordHash / 2FA secret / apiKeyHash.
    res.json({
      user: {
        id: after.id,
        username: after.username,
        email: after.email,
        role: after.role,
        status: after.status,
        isVip: after.isVip,
        isReseller: after.isReseller,
      },
    });
  }),
);
