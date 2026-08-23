import { Router } from "express";
import { adjustWalletSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { creditWallet, debitWallet, getWalletForUser } from "../../services/wallet.service.js";
import { writeAuditLog } from "../../services/audit.service.js";

export const adminWalletRouter = Router();

adminWalletRouter.post(
  "/:userId/adjust",
  validate(adjustWalletSchema),
  asyncHandler(async (req, res) => {
    const { amount, reason } = req.body as { amount: number; reason: string };
    const userId = req.params.userId!;

    const result =
      amount > 0
        ? await creditWallet({
            userId,
            amount,
            type: "ADMIN_ADJUSTMENT",
            referenceType: "ADMIN",
            referenceId: req.user!.id,
            note: reason,
          })
        : await debitWallet({
            userId,
            amount: Math.abs(amount),
            type: "ADMIN_ADJUSTMENT",
            referenceType: "ADMIN",
            referenceId: req.user!.id,
            note: reason,
          });

    await writeAuditLog({
      actorId: req.user!.id,
      action: "wallet.admin_adjustment",
      targetType: "Wallet",
      targetId: result.walletId,
      after: { amount, reason },
      ip: req.ip,
    });

    res.json({ balance: result.balanceAfter.toString() });
  }),
);

adminWalletRouter.get(
  "/:userId",
  asyncHandler(async (req, res) => {
    const wallet = await getWalletForUser(req.params.userId!);
    res.json({ wallet: { balance: wallet.balance.toString(), currency: wallet.currency } });
  }),
);
