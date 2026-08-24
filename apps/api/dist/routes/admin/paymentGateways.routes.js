import { Router } from "express";
import { PaymentGatewayKeys, updateGatewayConfigSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";
import { listGatewayConfigs, upsertGatewayConfig } from "../../services/payments/config.service.js";
import { writeAuditLog } from "../../services/audit.service.js";
export const adminPaymentGatewaysRouter = Router();
function requireKnownGateway(rawKey) {
    const key = rawKey.toUpperCase();
    if (!PaymentGatewayKeys.includes(key)) {
        throw AppError.notFound("Unknown payment gateway");
    }
    return key;
}
adminPaymentGatewaysRouter.get("/", asyncHandler(async (_req, res) => {
    res.json({ items: await listGatewayConfigs() });
}));
adminPaymentGatewaysRouter.put("/:provider", validate(updateGatewayConfigSchema), asyncHandler(async (req, res) => {
    const provider = requireKnownGateway(req.params.provider);
    await upsertGatewayConfig(provider, req.body);
    await writeAuditLog({
        actorId: req.user.id,
        action: "payment_gateway.update",
        targetType: "PaymentGatewayConfig",
        targetId: provider,
        // Never write credentials (even encrypted form) into the audit trail.
        after: { mode: req.body.mode, enabled: req.body.enabled, autoVerify: req.body.autoVerify },
        ip: req.ip,
    });
    res.status(204).end();
}));
