import { Router } from "express";
import { purchasePackageSchema } from "@smm/shared";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { orderLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { listBrandsPublic, getBrandPublic } from "../services/brand.service.js";
import { getProductBySlugPublic, listProductsPublic } from "../services/product.service.js";
import { listPackagesPublic } from "../services/package.service.js";
import { getDeliveredCodeForOrder, purchasePackage } from "../services/store.service.js";
function serializeDecimals(obj, keys) {
    const out = { ...obj };
    for (const key of keys) {
        const value = obj[key];
        if (value != null)
            out[key] = String(value);
    }
    return out;
}
// Public browsing (Store page + Overview section) — no auth guard, same
// convention as routes/public.routes.ts. Access Type gating and order-limit
// enforcement only ever happen at purchase time (see /purchase below); the
// frontend uses the logged-in user's isVip/isReseller flags (see
// auth.service.ts's publicUser) to show a lock on a card it can't buy.
export const storeRouter = Router();
storeRouter.get("/brands", asyncHandler(async (req, res) => {
    const brands = await listBrandsPublic();
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const items = limit && limit > 0 ? brands.slice(0, limit) : brands;
    res.json({ items });
}));
storeRouter.get("/brands/:id/products", asyncHandler(async (req, res) => {
    await getBrandPublic(req.params.id);
    const products = await listProductsPublic(req.params.id);
    res.json({ items: products.map((p) => serializeDecimals(p, ["salePrice", "buyPrice", "minAmountForPremium"])) });
}));
storeRouter.get("/products/:slug", asyncHandler(async (req, res) => {
    const product = await getProductBySlugPublic(req.params.slug);
    res.json({ product: serializeDecimals(product, ["salePrice", "buyPrice", "minAmountForPremium"]) });
}));
storeRouter.get("/products/:id/packages", asyncHandler(async (req, res) => {
    const packages = await listPackagesPublic(req.params.id);
    res.json({
        items: packages.map((p) => serializeDecimals(p, ["salePrice", "buyPrice", "commonPriceUsd", "extraFee"])),
    });
}));
storeRouter.post("/purchase", authenticate, orderLimiter, validate(purchasePackageSchema), asyncHandler(async (req, res) => {
    const idempotencyKey = req.header("Idempotency-Key");
    if (!idempotencyKey) {
        throw AppError.badRequest("Idempotency-Key header is required to place an order");
    }
    const result = await purchasePackage(req.user.id, req.body, idempotencyKey);
    res.status(201).json(result);
}));
storeRouter.get("/orders/:id/code", authenticate, asyncHandler(async (req, res) => {
    const code = await getDeliveredCodeForOrder(req.user.id, req.params.id);
    res.json({ code });
}));
