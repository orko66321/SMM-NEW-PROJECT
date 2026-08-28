import { Router } from "express";
import { brandObjectSchema, paginationQuerySchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createBrand, deleteBrand, getBrandForAdmin, listBrandsForAdmin, updateBrand } from "../../services/brand.service.js";
import { writeAuditLog } from "../../services/audit.service.js";
export const adminBrandsRouter = Router();
adminBrandsRouter.get("/", validate(paginationQuerySchema, "query"), asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query;
    res.json(await listBrandsForAdmin(page, pageSize));
}));
adminBrandsRouter.get("/:id", asyncHandler(async (req, res) => res.json({ brand: await getBrandForAdmin(req.params.id) })));
adminBrandsRouter.post("/", validate(brandObjectSchema), asyncHandler(async (req, res) => {
    const brand = await createBrand(req.body);
    await writeAuditLog({ actorId: req.user.id, action: "brand.create", targetType: "Brand", targetId: brand.id, after: req.body, ip: req.ip });
    res.status(201).json({ brand });
}));
adminBrandsRouter.put("/:id", validate(brandObjectSchema.partial()), asyncHandler(async (req, res) => {
    const brand = await updateBrand(req.params.id, req.body);
    await writeAuditLog({ actorId: req.user.id, action: "brand.update", targetType: "Brand", targetId: req.params.id, after: req.body, ip: req.ip });
    res.json({ brand });
}));
adminBrandsRouter.delete("/:id", asyncHandler(async (req, res) => {
    await deleteBrand(req.params.id);
    await writeAuditLog({ actorId: req.user.id, action: "brand.delete", targetType: "Brand", targetId: req.params.id, ip: req.ip });
    res.status(204).end();
}));
