import { Router } from "express";
import { createDepositSchema, paginationQuerySchema } from "@smm/shared";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getWalletForUser, listWalletTransactions } from "../services/wallet.service.js";
import { createDeposit, listDepositsForUser } from "../services/deposit.service.js";

export const walletRouter = Router();
walletRouter.use(authenticate);

walletRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const wallet = await getWalletForUser(req.user!.id);
    res.json({ wallet: { balance: wallet.balance.toString(), currency: wallet.currency } });
  }),
);

walletRouter.get(
  "/transactions",
  validate(paginationQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    const result = await listWalletTransactions(req.user!.id, page, pageSize);
    res.json({
      ...result,
      items: result.items.map((t) => ({ ...t, amount: t.amount.toString(), balanceAfter: t.balanceAfter.toString() })),
    });
  }),
);

walletRouter.post(
  "/deposits",
  validate(createDepositSchema),
  asyncHandler(async (req, res) => {
    const deposit = await createDeposit(req.user!.id, req.body);
    res.status(201).json({ deposit });
  }),
);

walletRouter.get(
  "/deposits",
  validate(paginationQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    const result = await listDepositsForUser(req.user!.id, page, pageSize);
    res.json(result);
  }),
);
