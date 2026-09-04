import { Router } from "express";
import { commentTemplateInputSchema } from "@smm/shared";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createCommentTemplate, deleteCommentTemplate, listCommentTemplates, updateCommentTemplate, } from "../../services/commentTemplate.service.js";
import { writeAuditLog } from "../../services/audit.service.js";
export const adminCommentTemplatesRouter = Router();
adminCommentTemplatesRouter.get("/", asyncHandler(async (_req, res) => {
    res.json({ items: await listCommentTemplates() });
}));
adminCommentTemplatesRouter.post("/", validate(commentTemplateInputSchema), asyncHandler(async (req, res) => {
    const template = await createCommentTemplate(req.body);
    await writeAuditLog({ actorId: req.user.id, action: "commentTemplate.create", targetType: "CommentTemplate", targetId: template.id, after: req.body, ip: req.ip });
    res.status(201).json({ template });
}));
adminCommentTemplatesRouter.put("/:id", validate(commentTemplateInputSchema.partial()), asyncHandler(async (req, res) => {
    const template = await updateCommentTemplate(req.params.id, req.body);
    await writeAuditLog({ actorId: req.user.id, action: "commentTemplate.update", targetType: "CommentTemplate", targetId: req.params.id, after: req.body, ip: req.ip });
    res.json({ template });
}));
adminCommentTemplatesRouter.delete("/:id", asyncHandler(async (req, res) => {
    await deleteCommentTemplate(req.params.id);
    await writeAuditLog({ actorId: req.user.id, action: "commentTemplate.delete", targetType: "CommentTemplate", targetId: req.params.id, ip: req.ip });
    res.status(204).end();
}));
