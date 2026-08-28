import { Router } from "express";
import { packageObjectSchema, packageListQuerySchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createPackage, deletePackage, getPackageForAdmin, listPackagesForAdmin, updatePackage } from "../../services/package.service.js";
import { writeAuditLog } from "../../services/audit.service.js";
export const adminPackagesRouter = Router();
adminPackagesRouter.get("/", validate(packageListQuerySchema, "query"), asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query;
    const productId = typeof req.query.productId === "string" ? req.query.productId : undefined;
    res.json(await listPackagesForAdmin(page, pageSize, productId));
}));
adminPackagesRouter.get("/:id", asyncHandler(async (req, res) => res.json({ package: await getPackageForAdmin(req.params.id) })));
adminPackagesRouter.post("/", validate(packageObjectSchema), asyncHandler(async (req, res) => {
    const pkg = await createPackage(req.body);
    await writeAuditLog({ actorId: req.user.id, action: "package.create", targetType: "Package", targetId: pkg.id, after: req.body, ip: req.ip });
    res.status(201).json({ package: pkg });
}));
adminPackagesRouter.put("/:id", validate(packageObjectSchema.partial()), asyncHandler(async (req, res) => {
    const pkg = await updatePackage(req.params.id, req.body);
    await writeAuditLog({ actorId: req.user.id, action: "package.update", targetType: "Package", targetId: req.params.id, after: req.body, ip: req.ip });
    res.json({ package: pkg });
}));
adminPackagesRouter.delete("/:id", asyncHandler(async (req, res) => {
    await deletePackage(req.params.id);
    await writeAuditLog({ actorId: req.user.id, action: "package.delete", targetType: "Package", targetId: req.params.id, ip: req.ip });
    res.status(204).end();
}));
