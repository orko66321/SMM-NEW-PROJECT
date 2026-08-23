import { Router } from "express";
import { createProviderSchema, updateProviderSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createProvider, listProviders, listProviderSyncLogs, syncProviderCatalog, updateProvider } from "../../services/providers.service.js";
import { writeAuditLog } from "../../services/audit.service.js";

export const adminProvidersRouter = Router();

adminProvidersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ items: await listProviders() });
  }),
);

adminProvidersRouter.post(
  "/",
  validate(createProviderSchema),
  asyncHandler(async (req, res) => {
    const provider = await createProvider(req.body);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "provider.create",
      targetType: "Provider",
      targetId: provider.id,
      after: { name: provider.name, apiUrl: provider.apiUrl },
      ip: req.ip,
    });
    res.status(201).json({ provider });
  }),
);

adminProvidersRouter.put(
  "/:id",
  validate(updateProviderSchema),
  asyncHandler(async (req, res) => {
    const provider = await updateProvider(req.params.id!, req.body);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "provider.update",
      targetType: "Provider",
      targetId: req.params.id!,
      // Never write the raw apiKey (if present) into the audit trail.
      after: { name: req.body.name, apiUrl: req.body.apiUrl, status: req.body.status, apiKeyRotated: !!req.body.apiKey },
      ip: req.ip,
    });
    res.json({ provider });
  }),
);

adminProvidersRouter.get(
  "/:id/logs",
  asyncHandler(async (req, res) => {
    res.json({ items: await listProviderSyncLogs(req.params.id!) });
  }),
);

adminProvidersRouter.post(
  "/:id/sync",
  asyncHandler(async (req, res) => {
    const result = await syncProviderCatalog(req.params.id!);
    await writeAuditLog({
      actorId: req.user!.id,
      action: "provider.sync",
      targetType: "Provider",
      targetId: req.params.id!,
      after: result,
      ip: req.ip,
    });
    res.json(result);
  }),
);
