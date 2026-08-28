import { Router } from "express";
import { paginationQuerySchema, stockPoolBulkAddSchema, stockPoolInputSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { bulkAddStockCodes, createStockPool, deleteStockPool, listStockCodesForAdmin, listStockPoolsForAdmin, revokeStockCode, } from "../../services/stockPool.service.js";
import { writeAuditLog } from "../../services/audit.service.js";
export const adminStockPoolsRouter = Router();
adminStockPoolsRouter.get("/", validate(paginationQuerySchema, "query"), asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query;
    res.json(await listStockPoolsForAdmin(page, pageSize));
}));
adminStockPoolsRouter.post("/", validate(stockPoolInputSchema), asyncHandler(async (req, res) => {
    const pool = await createStockPool(req.body);
    await writeAuditLog({ actorId: req.user.id, action: "stockPool.create", targetType: "StockPool", targetId: pool.id, after: req.body, ip: req.ip });
    res.status(201).json({ pool });
}));
adminStockPoolsRouter.delete("/:id", asyncHandler(async (req, res) => {
    await deleteStockPool(req.params.id);
    await writeAuditLog({ actorId: req.user.id, action: "stockPool.delete", targetType: "StockPool", targetId: req.params.id, ip: req.ip });
    res.status(204).end();
}));
adminStockPoolsRouter.get("/:id/codes", validate(paginationQuerySchema, "query"), asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query;
    res.json(await listStockCodesForAdmin(req.params.id, page, pageSize));
}));
adminStockPoolsRouter.post("/:id/codes", validate(stockPoolBulkAddSchema), asyncHandler(async (req, res) => {
    const result = await bulkAddStockCodes(req.params.id, req.body.codes);
    await writeAuditLog({
        actorId: req.user.id,
        action: "stockPool.bulkAddCodes",
        targetType: "StockPool",
        targetId: req.params.id,
        after: result,
        ip: req.ip,
    });
    res.status(201).json(result);
}));
adminStockPoolsRouter.post("/codes/:codeId/revoke", asyncHandler(async (req, res) => {
    await revokeStockCode(req.params.codeId);
    await writeAuditLog({ actorId: req.user.id, action: "stockCode.revoke", targetType: "StockCode", targetId: req.params.codeId, ip: req.ip });
    res.status(204).end();
}));
