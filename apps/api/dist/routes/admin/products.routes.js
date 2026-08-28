import { Router } from "express";
import { productObjectSchema, productInputSchema, productListQuerySchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createProduct, deleteProduct, getProductForAdmin, listProductsForAdmin, updateProduct } from "../../services/product.service.js";
import { writeAuditLog } from "../../services/audit.service.js";
export const adminProductsRouter = Router();
adminProductsRouter.get("/", validate(productListQuerySchema, "query"), asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query;
    const brandId = typeof req.query.brandId === "string" ? req.query.brandId : undefined;
    res.json(await listProductsForAdmin(page, pageSize, brandId));
}));
adminProductsRouter.get("/:id", asyncHandler(async (req, res) => res.json({ product: await getProductForAdmin(req.params.id) })));
adminProductsRouter.post("/", validate(productInputSchema), asyncHandler(async (req, res) => {
    const product = await createProduct(req.body);
    await writeAuditLog({ actorId: req.user.id, action: "product.create", targetType: "Product", targetId: product.id, after: req.body, ip: req.ip });
    res.status(201).json({ product });
}));
adminProductsRouter.put("/:id", validate(productObjectSchema.partial()), asyncHandler(async (req, res) => {
    const product = await updateProduct(req.params.id, req.body);
    await writeAuditLog({ actorId: req.user.id, action: "product.update", targetType: "Product", targetId: req.params.id, after: req.body, ip: req.ip });
    res.json({ product });
}));
adminProductsRouter.delete("/:id", asyncHandler(async (req, res) => {
    await deleteProduct(req.params.id);
    await writeAuditLog({ actorId: req.user.id, action: "product.disable", targetType: "Product", targetId: req.params.id, ip: req.ip });
    res.status(204).end();
}));
